"""
.. module:: PixelCraft.feature_list
    :platform: OS X
    :synopsis: This module creates list of features for image module
"""

import os
import cv2
import pathlib
import numpy as np


class FeatureList:
    """Adapter class for features
    """

    def __init__(self):
        self.features = []
        # Getting the absolute path for the directory in which all the feature modules are kept
        features_modules_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "image_features")
        features_modules_list = os.listdir(features_modules_path)

        # Iterating over each feature module, importing it and adding it to features list
        for each_feature in features_modules_list:

            # Checking if the file is a python file and in format: <feature name>_feature.py
            if each_feature.endswith(".py") and len(each_feature.split("_")) == 2:
                splitted_name = each_feature.split(".")
                module_name = splitted_name[0]
                class_name = "".join([_.title() for _ in module_name.split("_")])

                # Dynamically import the module
                module = __import__(f"PixelCraft.image_features.{module_name}", fromlist=[class_name])
                # Get the class from the module
                feature_class = getattr(module, class_name)
                # Create an instance
                dummy_obj = feature_class()
                self.features.append(dummy_obj)

    def get_features(self):
        """ Function to get list of all the builtin features

            :return: Returns list of features
            :rtype: python list of features objects
        """
        return self.features
