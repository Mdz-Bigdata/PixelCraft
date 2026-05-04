#!/usr/bin/env python3
import os
import re

def replace_in_file(filepath, old_str, new_str):
    """Replace old_str with new_str in a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if old_str in content:
            content = content.replace(old_str, new_str)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"Updated: {filepath}")
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def rename_project(root_dir):
    """Rename all occurrences of PixelCraft to PixelCraft"""
    print("="*60)
    print("Renaming PixelCraft to PixelCraft")
    print("="*60)
    
    count = 0
    
    # Walk through all files
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip git and other special directories
        if '.git' in dirpath:
            continue
        if '__pycache__' in dirpath:
            continue
        if 'node_modules' in dirpath:
            continue
        if '.trae' in dirpath:
            continue
        
        for filename in filenames:
            # Only process certain file types
            if filename.endswith(('.py', '.md', '.rst', '.txt', '.yml', '.yaml', '.sh', '.js', '.ts', '.json', '.html')):
                filepath = os.path.join(dirpath, filename)
                
                # Replace PixelCraft with PixelCraft
                updated = replace_in_file(filepath, 'PixelCraft', 'PixelCraft')
                if updated:
                    count += 1
                
                # Replace pixelcraft with pixelcraft (lowercase)
                updated = replace_in_file(filepath, 'pixelcraft', 'pixelcraft')
                if updated:
                    count += 1
    
    print(f"\nTotal updates: {count}")
    print("="*60)
    print("Rename complete!")
    print("="*60)

if __name__ == "__main__":
    root_dir = os.path.dirname(os.path.abspath(__file__))
    rename_project(root_dir)
