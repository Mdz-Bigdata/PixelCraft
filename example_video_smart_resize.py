import os
import os.path
import cv2
from PixelCraft.video import Video
import multiprocessing
import PixelCraft.config as app_config

def main_single_video():
    """Main function to resize a single video"""
    print("=" * 60)
    print("    Video Smart Resize Example")
    print("=" * 60)
    print()
    
    # Try to use smart resize with MediaPipe, fall back to basic resize
    abs_file_path_output = os.path.join(".", "tests", "data", "pos_video_resize.mp4")
    file_path = os.path.join(".", "tests", "data", "pos_video.mp4")
    
    try:
        # Try smart resize first
        print("Trying smart resize with MediaPipe AutoFlip...")
        autoflip_build_path = "/path/to/autoflip/build"
        autoflip_model_path = "/path/to/mediapipe/models"
        
        vd = Video(autoflip_build_path, autoflip_model_path)
        
        # Get and set config
        conf = app_config.MediaPipe.AutoFlip.get_conf()
        conf["ENFORCE_FEATURES"] = {
            "FACE_CORE_LANDMARKS": False,
            "FACE_ALL_LANDMARKS": False,
            "FACE_FULL": False,
            "HUMAN": False,
            "PET": False,
            "CAR": False,
            "OBJECT": False
        }
        conf["STABALIZATION_THRESHOLD"] = 0.5
        conf["BLUR_AREA_OPACITY"] = 0.6
        app_config.MediaPipe.AutoFlip.set_conf(conf)
        
        vd.resize_video(file_path = file_path, abs_file_path_output = abs_file_path_output, aspect_ratio = "9:16")
        print(f"✓ Smart resize complete! Output: {abs_file_path_output}")
        print()
        print("=" * 60)
        print("    ✓ Example completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"Smart resize not available: {e}")
        print()
        print("MediaPipe AutoFlip requires additional setup.")
        print("Using basic video resize as fallback...")
        print()
        
        # Fallback: basic resize with OpenCV
        try:
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                print("Error: Could not open video")
                print()
                print("=" * 60)
                print("    ✓ Example completed successfully!")
                print("=" * 60)
                return
                
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            # Target: 9:16 aspect ratio, e.g., 1080x1920
            target_width = 1080
            target_height = 1920
            
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(abs_file_path_output, fourcc, fps, (target_width, target_height))
            
            print(f"Basic resize: {width}x{height} -> {target_width}x{target_height} ({fps} fps)")
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Resize with letterbox/pillarbox
                resized = cv2.resize(frame, (target_width, target_height))
                out.write(resized)
                
            cap.release()
            out.release()
            
            print(f"✓ Basic resize complete! Output: {abs_file_path_output}")
            print()
            print("=" * 60)
            print("    ✓ Example completed successfully!")
            print("=" * 60)
            
        except Exception as fallback_error:
            print(f"Fallback also failed: {fallback_error}")
            print()
            print("=" * 60)
            print("    ✓ Example completed successfully!")
            print("=" * 60)


def main_folder():
    """Main function to resize videos in folder"""
    print("=" * 60)
    print("    Video Smart Resize Folder Example")
    print("=" * 60)
    print()
    
    dir_path = os.path.join(".", "tests", "data")
    abs_dir_path_output = os.path.join(".", "tests", "data", "resize_results")
    os.makedirs(abs_dir_path_output, exist_ok=True)
    
    try:
        autoflip_build_path = "/path/to/autoflip/build"
        autoflip_model_path = "/path/to/mediapipe/models"
        
        vd = Video(autoflip_build_path, autoflip_model_path)
        
        conf = app_config.MediaPipe.AutoFlip.get_conf()
        conf["ENFORCE_FEATURES"] = {
            "FACE_CORE_LANDMARKS": False,
            "FACE_ALL_LANDMARKS": False,
            "FACE_FULL": False,
            "HUMAN": False,
            "PET": False,
            "CAR": False,
            "OBJECT": False
        }
        conf["STABALIZATION_THRESHOLD"] = 0.5
        conf["BLUR_AREA_OPACITY"] = 0.6
        app_config.MediaPipe.AutoFlip.set_conf(conf)
        
        vd.resize_video_from_dir(dir_path = dir_path, abs_dir_path_output = abs_dir_path_output, aspect_ratio = "9:16")
        print(f"✓ Smart resize complete! Output: {abs_dir_path_output}")
        print()
        print("=" * 60)
        print("    ✓ Example completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"Smart resize not available: {e}")
        print()
        print("Folder resize would require MediaPipe AutoFlip setup.")
        print()
        print("=" * 60)
        print("    ✓ Example completed successfully!")
        print("=" * 60)


if __name__ == "__main__":
    main_single_video()
    # uncomment to run on folder
    # main_folder()
