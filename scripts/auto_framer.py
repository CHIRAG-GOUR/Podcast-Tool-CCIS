import cv2
import mediapipe as mp
import json
import sys
import os
import math

def calculate_mar(face_landmarks, w, h):
    top_lip = face_landmarks.landmark[13]
    bottom_lip = face_landmarks.landmark[14]
    left_lip = face_landmarks.landmark[78]
    right_lip = face_landmarks.landmark[308]
    
    tx, ty = int(top_lip.x * w), int(top_lip.y * h)
    bx, by = int(bottom_lip.x * w), int(bottom_lip.y * h)
    lx, ly = int(left_lip.x * w), int(left_lip.y * h)
    rx, ry = int(right_lip.x * w), int(right_lip.y * h)
    
    vert_dist = math.hypot(tx - bx, ty - by)
    horiz_dist = math.hypot(lx - rx, ly - ry)
    
    if horiz_dist == 0: return 0
    return vert_dist / horiz_dist

def get_bounding_box(face_landmarks, w, h):
    x_coords = [lm.x * w for lm in face_landmarks.landmark]
    xmin, xmax = int(min(x_coords)), int(max(x_coords))
    return (xmin + xmax) // 2

def analyze_video(video_path, output_json):
    print(f"Analyzing {video_path}...")
    
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=4, # Support up to 4 dynamic speakers
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    frame_skip = max(1, int(fps / 5)) # Analyze ~5 frames per second
    
    # 1. Extract all faces from all frames
    raw_data = []
    frame_idx = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_idx % frame_skip == 0:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)
            
            timestamp = frame_idx / fps
            frame_faces = []
            
            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    mar = calculate_mar(face_landmarks, width, height)
                    cx = get_bounding_box(face_landmarks, width, height)
                    frame_faces.append({"cx_percent": cx / width, "mar": mar})
                    
            raw_data.append({"time": timestamp, "faces": frame_faces})
            
            if frame_idx % (fps * 5) == 0:
                print(f"Processed {frame_idx}/{total_frames} frames ({int(frame_idx/total_frames*100)}%)")
                
        frame_idx += 1
        
    cap.release()

    # 2. Cluster faces to identify distinct persistent speakers
    speaker_clusters = [] # list of dicts: {"center": avg_cx, "count": N}
    for data in raw_data:
        for face in data["faces"]:
            matched = False
            for cluster in speaker_clusters:
                # 15% width tolerance for matching a person
                if abs(cluster["center"] - face["cx_percent"]) < 0.15:
                    cluster["center"] = (cluster["center"] * cluster["count"] + face["cx_percent"]) / (cluster["count"] + 1)
                    cluster["count"] += 1
                    matched = True
                    break
            if not matched:
                speaker_clusters.append({"center": face["cx_percent"], "count": 1})
                
    speaker_clusters.sort(key=lambda x: x["center"])
    
    def get_speaker_id(cx_percent):
        if not speaker_clusters: return cx_percent
        return min(speaker_clusters, key=lambda c: abs(c["center"] - cx_percent))["center"]

    # 3. Build a continuous timeline of each speaker's MAR
    speaker_mars = {c["center"]: [] for c in speaker_clusters}
    times = []
    
    for data in raw_data:
        times.append(data["time"])
        frame_mars = {c["center"]: 0 for c in speaker_clusters}
        
        for face in data["faces"]:
            sid = get_speaker_id(face["cx_percent"])
            if sid in frame_mars:
                frame_mars[sid] = max(frame_mars[sid], face["mar"])
                
        for sid in speaker_clusters:
            speaker_mars[sid["center"]].append(frame_mars[sid["center"]])

    # 3.5 Calculate baseline and normalize MAR for each speaker
    # This completely ignores people whose resting face has a slightly open mouth (head bobbing)
    normalized_mars = {c["center"]: [] for c in speaker_clusters}
    for sid in speaker_clusters:
        mars = speaker_mars[sid["center"]]
        
        # Sort MARs to find resting baseline (20th percentile)
        sorted_mars = sorted(mars)
        baseline_mar = sorted_mars[int(len(sorted_mars) * 0.2)] if sorted_mars else 0
        
        # Find active speaking MAR (95th percentile)
        active_mar = sorted_mars[int(len(sorted_mars) * 0.95)] if sorted_mars else 1
        mar_range = max(0.01, active_mar - baseline_mar)
        
        for mar in mars:
            norm = (mar - baseline_mar) / mar_range
            normalized_mars[sid["center"]].append(max(0.0, min(1.0, norm)))

    # 4. Compute Lip Activity (Velocity of MAR changes) to ignore head nodding
    window_size = 4 # +/- 4 samples @ 5fps = ~1.6s smoothing window
    lip_activity = {sid["center"]: [] for sid in speaker_clusters}
    
    for sid in speaker_clusters:
        mars = normalized_mars[sid["center"]]
        
        # Calculate frame-to-frame velocity
        velocities = [0.0]
        for i in range(1, len(mars)):
            velocities.append(abs(mars[i] - mars[i-1]))
            
        for i in range(len(mars)):
            start = max(0, i - window_size)
            end = min(len(mars), i + window_size + 1)
            
            window_vel = velocities[start:end]
            window_mars = mars[start:end]
            
            avg_vel = sum(window_vel) / len(window_vel)
            avg_mar = sum(window_mars) / len(window_mars)
            
            # True speaking involves both high lip movement AND mouth openness
            lip_activity[sid["center"]].append(avg_vel * avg_mar)
            
    # Normalize the activity scores so the primary speaker hits 1.0
    for sid in speaker_clusters:
        act = lip_activity[sid["center"]]
        max_act = max(act) if act and max(act) > 0 else 1
        lip_activity[sid["center"]] = [a / max_act for a in act]

    # 5. Decide active speaker using Strong Hysteresis on Activity Score
    active_speaker = None
    time_since_speaker_changed = 0
    cuts = []
    
    for i, t in enumerate(times):
        max_act = 0
        best_speaker = None
        
        for sid in speaker_clusters:
            if lip_activity[sid["center"]][i] > max_act:
                max_act = lip_activity[sid["center"]][i]
                best_speaker = sid["center"]
                
        # Normalized threshold: > 0.15 means they show at least 15% of their max speaking activity
        is_talking = max_act > 0.15
        
        if active_speaker is None:
            active_speaker = best_speaker if is_talking else (speaker_clusters[0]["center"] if speaker_clusters else 0.5)
            cuts.append({"start": t, "end": t, "cx_percent": active_speaker})
            
        elif is_talking and best_speaker != active_speaker:
            time_since_speaker_changed += (times[i] - times[i-1]) if i > 0 else 0
            current_speaker_act = lip_activity[active_speaker][i]
            
            # Require the new speaker to be dominant for at least 1.0s OR require current speaker to be quiet
            if time_since_speaker_changed > 1.0 or (current_speaker_act < 0.1 and max_act > 0.3 and time_since_speaker_changed > 0.4):
                # Enforce minimum cut duration of 2.0s (Wait for sentence to complete!)
                if t - cuts[-1]["start"] >= 2.0:
                    cuts[-1]["end"] = t
                    cuts.append({"start": t, "end": t, "cx_percent": best_speaker})
                    active_speaker = best_speaker
                    time_since_speaker_changed = 0
        else:
            time_since_speaker_changed = 0
            
    # Finish the last cut
    if cuts:
        cuts[-1]["end"] = times[-1] if times else 0
        
    # Format output
    final_cuts = []
    for c in cuts:
        final_cuts.append({
            "start": round(c["start"], 2),
            "end": round(c["end"], 2),
            "cx_percent": round(c["cx_percent"], 4),
            "speaker": f"speaker_{round(c['cx_percent']*100)}",
            "crop_y": 0
        })

    with open(output_json, 'w') as f:
        json.dump({"cuts": final_cuts}, f, indent=2)
        
    print(f"\nAnalysis complete! Saved to {output_json}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python auto_framer.py <input_video.mp4> <output.json>")
        sys.exit(1)
        
    analyze_video(sys.argv[1], sys.argv[2])
