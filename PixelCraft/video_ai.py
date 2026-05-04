#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
PixelCraft AI Video Generation Module.
This module provides AI-powered video generation using Stable Diffusion 2.0
for creating derivative videos from keyframes with custom prompts.
"""

import os
import sys
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple, Union
from pathlib import Path
from PIL import Image as PILImage
import warnings
import shutil

try:
    import torch
    from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline
    from diffusers import EulerDiscreteScheduler
    HAS_AI = True
except ImportError:
    HAS_AI = False


class VideoAIGenerator:
    """
    AI Video Generator class for creating derivative videos using Stable Diffusion.
    
    Example:
        >>> from PixelCraft.video_ai import VideoAIGenerator
        >>> generator = VideoAIGenerator()
        >>> frames, fps = generator.generate_video(
        ...     prompt="A beautiful sunset over the ocean",
        ...     keyframes_dir="selectedframes",
        ...     output_dir="ai_generated"
        ... )
    """
    
    def __init__(
        self,
        model_id: str = "stabilityai/stable-diffusion-2",
        device: Optional[str] = None
    ):
        """
        Initialize VideoAIGenerator.
        
        Args:
            model_id: Stable Diffusion model ID
            device: Device to use (auto-detect if None)
        """
        self.model_id = model_id
        self.has_ai = HAS_AI
        
        if self.has_ai:
            if device is None:
                device = "cuda" if torch.cuda.is_available() else "cpu"
            self.device = device
            self.text2img_pipe = None
            self.img2img_pipe = None
        else:
            self.device = "cpu"
            self.text2img_pipe = None
            self.img2img_pipe = None
            print("Warning: AI dependencies not installed.")
            print("Will use keyframe concatenation as fallback.")
        
    def load_model(self, use_img2img: bool = False):
        """
        Load Stable Diffusion model.
        
        Args:
            use_img2img: Load img2img pipeline instead of text2img
        """
        torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        
        if use_img2img:
            self.img2img_pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
                self.model_id,
                torch_dtype=torch_dtype,
                use_auth_token=True
            ).to(self.device)
            self.img2img_pipe.scheduler = EulerDiscreteScheduler.from_config(
                self.img2img_pipe.scheduler.config
            )
        else:
            self.text2img_pipe = StableDiffusionPipeline.from_pretrained(
                self.model_id,
                torch_dtype=torch_dtype,
                use_auth_token=True
            ).to(self.device)
            self.text2img_pipe.scheduler = EulerDiscreteScheduler.from_config(
                self.text2img_pipe.scheduler.config
            )
    
    def generate_single_image(
        self,
        prompt: str,
        negative_prompt: str = "blurry, ugly, bad anatomy, bad art",
        image: Optional[Union[str, np.ndarray]] = None,
        strength: float = 0.75,
        guidance_scale: float = 7.5,
        num_inference_steps: int = 50,
        height: int = 512,
        width: int = 512
    ) -> np.ndarray:
        """
        Generate a single AI image.
        
        Args:
            prompt: Text prompt for generation
            negative_prompt: Negative prompts
            image: Optional input image for img2img
            strength: How much to modify the input image (0-1)
            guidance_scale: Prompt guidance scale
            num_inference_steps: Number of denoising steps
            height: Output image height
            width: Output image width
            
        Returns:
            Generated image as numpy array (RGB)
        """
        if image is not None:
            if self.img2img_pipe is None:
                self.load_model(use_img2img=True)
            
            if isinstance(image, str):
                init_image = PILImage.open(image).convert("RGB")
            elif isinstance(image, np.ndarray):
                init_image = PILImage.fromarray(image).convert("RGB")
                
            init_image = init_image.resize((width, height))
            
            result = self.img2img_pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=init_image,
                strength=strength,
                guidance_scale=guidance_scale,
                num_inference_steps=num_inference_steps
            )
        else:
            if self.text2img_pipe is None:
                self.load_model(use_img2img=False)
                
            result = self.text2img_pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                guidance_scale=guidance_scale,
                num_inference_steps=num_inference_steps,
                height=height,
                width=width
            )
            
        img = result.images[0]
        return np.array(img)
    
    def generate_video(
        self,
        keyframes: List[str],
        output_dir: str,
        prompt: str = "beautiful scene, high quality",
        frame_indices: Optional[List[int]] = None,
        per_frame_prompts: Optional[Dict[int, str]] = None,
        negative_prompt: str = "blurry, ugly, bad anatomy, bad art",
        strength: float = 0.7,
        guidance_scale: float = 7.5,
        num_inference_steps: int = 30,
        fps: float = 8.0,
        output_filename: str = "ai_generated_video.mp4"
    ) -> Optional[str]:
        """
        Generate a derivative video from keyframes.
        
        Args:
            keyframes: List of keyframe paths
            output_dir: Directory to save output
            prompt: Main text prompt
            frame_indices: Specific frame indices to process (all if None)
            per_frame_prompts: Optional custom prompts per frame index
            negative_prompt: Negative prompts
            strength: How much to modify each frame (0-1)
            guidance_scale: Prompt guidance scale
            num_inference_steps: Number of denoising steps per frame
            fps: Output video FPS
            output_filename: Output video filename
            
        Returns:
            Path to generated video, or None if failed
        """
        os.makedirs(output_dir, exist_ok=True)
        
        keyframe_files = keyframes
        
        if frame_indices:
            keyframe_files = [keyframe_files[i] for i in frame_indices 
                            if i < len(keyframe_files)]
        
        print(f"Found {len(keyframe_files)} keyframes")
        
        if not keyframe_files:
            print("No keyframes to process")
            return None
        
        generated_frames = []
        
        if self.has_ai:
            try:
                for idx, frame_path in enumerate(keyframe_files):
                    filename = os.path.basename(frame_path)
                    print(f"Processing frame {idx+1}/{len(keyframe_files)}: {filename}")
                    
                    frame_prompt = prompt
                    if per_frame_prompts and idx in per_frame_prompts:
                        frame_prompt = per_frame_prompts[idx]
                    
                    img = cv2.imread(frame_path)
                    if img is None:
                        warnings.warn(f"Could not read {filename}, skipping")
                        continue
                        
                    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    
                    h, w = img.shape[:2]
                    h = ((h + 63) // 64) * 64
                    w = ((w + 63) // 64) * 64
                    h = min(h, 768)
                    w = min(w, 768)
                    
                    ai_frame = self.generate_single_image(
                        prompt=frame_prompt,
                        negative_prompt=negative_prompt,
                        image=img_rgb,
                        strength=strength,
                        guidance_scale=guidance_scale,
                        num_inference_steps=num_inference_steps,
                        height=h,
                        width=w
                    )
                    
                    ai_frame_bgr = cv2.cvtColor(ai_frame, cv2.COLOR_RGB2BGR)
                    
                    out_path = os.path.join(output_dir, f"ai_{filename}")
                    cv2.imwrite(out_path, ai_frame_bgr)
                    
                    generated_frames.append(ai_frame_bgr)
                    
            except Exception as e:
                warnings.warn(f"AI generation failed: {e}")
                print("Falling back to keyframe concatenation")
                self.has_ai = False
        
        if not self.has_ai or not generated_frames:
            for idx, frame_path in enumerate(keyframe_files):
                filename = os.path.basename(frame_path)
                print(f"Using keyframe {idx+1}/{len(keyframe_files)}: {filename}")
                
                img = cv2.imread(frame_path)
                if img is None:
                    warnings.warn(f"Could not read {filename}, skipping")
                    continue
                
                h, w = img.shape[:2]
                h = ((h + 63) // 64) * 64
                w = ((w + 63) // 64) * 64
                h = min(h, 768)
                w = min(w, 768)
                
                resized = cv2.resize(img, (w, h))
                generated_frames.append(resized)
                
                out_path = os.path.join(output_dir, f"keyframe_{filename}")
                cv2.imwrite(out_path, resized)
        
        if generated_frames:
            output_path = os.path.join(output_dir, output_filename)
            self.frames_to_video(
                generated_frames,
                output_path,
                fps
            )
            print(f"Video generated at: {output_path}")
            return output_path
        else:
            print("No frames to generate video")
            return None
    
    def frames_to_video(
        self,
        frames: List[np.ndarray],
        output_path: str,
        fps: float = 8.0
    ):
        """
        Convert frames to a video file.
        
        Args:
            frames: List of frames as numpy arrays
            output_path: Output video path
            fps: Frames per second
        """
        if not frames:
            raise ValueError("No frames provided")
            
        h, w = frames[0].shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))
        
        for frame in frames:
            if frame.shape[:2] != (h, w):
                frame = cv2.resize(frame, (w, h))
            out.write(frame)
            
        out.release()
        print(f"Video saved to {output_path}")
