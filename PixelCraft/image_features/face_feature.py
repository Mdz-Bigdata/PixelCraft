"""
.. module:: Katana.image_features.face_feature
    :platform: OS X
    :synopsis: This module is for for getting Face detection feature Map from input image
"""

import os
import cv2
import math
import numpy as np
import time
import requests
import imutils
import random


from PixelCraft.image_features.feature import Feature
import PixelCraft.config as config


class FaceFeature(Feature):
    """Class for calculating Face detection feature map from input image \n
    Internal Parameters\n
    model_file : Path for downloading model for face detection\n
    prototxt_file : Path for downloading model description prototxt file\n
    confidence : Face detection confidence threshold value
    """

    def __init__(self, weight=1.0):
        """Constructor for this class does following tasks, if not already downloaded\
        , it first tries to download face detector model file and prototxt file from public URL\
        ands save it at USER_HOME/.pixelcraft directory, or /tmp/.pixelcraft directory.\
        If models cannot be downloaded, this feature will be disabled (graceful degradation).
        """
        super().__init__(weight)

        self.model_file = config.FaceFeature.model_file
        self.prototxt_file = config.FaceFeature.prototxt_file
        self.cache_subdir = config.FaceFeature.cache_subdir
        self.confidence = config.FaceFeature.confidence
        self.model_available = False  # Flag indicating if model is loaded successfully

        try:
            self.network_folder_path = os.path.join(os.path.expanduser("~"), ".pixelcraft")
            if not os.access(self.network_folder_path, os.W_OK):
                self.network_folder_path = os.path.join("/tmp", ".pixelcraft")
            self.datadir = os.path.join(self.network_folder_path, self.cache_subdir)
            if not os.path.exists(self.datadir):
                os.makedirs(self.datadir)

            self.network_model_file_path = os.path.join(self.datadir, self.model_file)
            self.network_prototxt_file_path = os.path.join(
                self.datadir, self.prototxt_file
            )
            
            # Check if both files exist and are valid
            model_exists = os.path.exists(self.network_model_file_path)
            prototxt_exists = os.path.exists(self.network_prototxt_file_path)
            
            model_valid = model_exists and os.path.getsize(self.network_model_file_path) > 1000
            prototxt_valid = prototxt_exists and os.path.getsize(self.network_prototxt_file_path) > 1000
            
            if model_exists and model_valid and prototxt_exists and prototxt_valid:
                # Try to load the model
                try:
                    self.net = cv2.dnn.readNetFromCaffe(
                        self.network_prototxt_file_path, self.network_model_file_path
                    )
                    self.model_available = True
                    print("Face detection model loaded successfully")
                except Exception as e:
                    print(f"Warning: Could not load face detection model: {e}")
                    self.model_available = False
                    self.net = None
            else:
                print("Face detection models not found, will skip face detection.")
                print("For full face detection, please manually download model files.")
                self.model_available = False
                self.net = None
        except Exception as e:
            print(f"Warning: Face detection disabled due to error: {e}")
            self.model_available = False
            self.net = None

    def download_proto(self):
        link = config.FaceFeature.prototxt_download_link
        try:
            r = requests.get(link, stream=True, timeout=90)
            r.raise_for_status()
            print("Downloading prototxt file...")
            tmp_path = os.path.join(self.datadir, self.prototxt_file + ".tmp")
            with open(tmp_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
            os.replace(tmp_path, os.path.join(self.datadir, self.prototxt_file))
            print("Prototext file downloaded.")
        except Exception as e:
            for p in [tmp_path if 'tmp_path' in dir() else None]:
                if p and os.path.exists(p):
                    os.remove(p)
            raise ConnectionError(
                "Failed to download {} from {}. Error: {}. "
                "Please manually download and save to {}".format(
                    self.prototxt_file, link, e, self.datadir
                )
            )

    def download_model(self):
        link = config.FaceFeature.modelfile_download_link
        try:
            r = requests.get(link, stream=True, timeout=90)
            r.raise_for_status()
            print("Downloading model file...")
            tmp_path = os.path.join(self.datadir, self.model_file + ".tmp")
            with open(tmp_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
            os.replace(tmp_path, os.path.join(self.datadir, self.model_file))
            print("Caffe Model file downloaded.")
        except Exception as e:
            for p in [tmp_path if 'tmp_path' in dir() else None]:
                if p and os.path.exists(p):
                    os.remove(p)
            raise ConnectionError(
                "Failed to download {} from {}. Error: {}. "
                "Please manually download and save to {}".format(
                    self.model_file, link, e, self.datadir
                )
            )

    def get_feature_map(self, image):
        """Public function for getting Feature map image from Face detection in input Image

        :param image: input image
        :type image: `numpy array`
        :return: single channel opencv numpy image with feature map from Face detection
        :rtype: numpy array
        """
        # If model not available, return blank feature map
        if not self.model_available or self.net is None:
            h, w = image.shape[:2]
            return np.zeros((h, w), dtype=np.uint8)
        
        try:
            frame = image.copy()
            (h, w) = frame.shape[:2]
            blob = cv2.dnn.blobFromImage(
                cv2.resize(frame, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0)
            )
            self.net.setInput(blob)
            detections = self.net.forward()
            gray = np.zeros((h, w), dtype=np.uint8)

            for i in range(0, detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence < self.confidence:
                    continue
                
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")
                cv2.rectangle(gray, (startX, startY), (endX, endY), (120), -1)

            return gray
        except Exception as e:
            print(f"Warning: Face detection failed: {e}")
            h, w = image.shape[:2]
            return np.zeros((h, w), dtype=np.uint8)
