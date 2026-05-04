"""
.. module:: PixelCraft.image_features.feature
    :platform: Cross Platform
    :synopsis: image_Feature.Feature is an Base class for Image feature\
         to be used for PixelCraft Image crop functionality all image features\
              inherit from this base class
"""

import os
import cv2
import numpy as np


class Feature:
    """Base Class: Base class for all Image features: To be used \
        for PixelCraft crop rectangle scoring, all image features inherit from \
            this base class
    """

    def __init__(self, weight):
        # Weight parameter for given feature
        self.weight = weight

    def get_weight(self):
        """gets weight of particular feature

        :return: weight of the feature
        :rtype: float
        """
        return self.weight
