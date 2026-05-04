"""
.. module:: PixelCraft.filterlist
    :platform: OS X
    :synopsis: This module creates list of filters for image module
"""

import os
import cv2
import pathlib
import numpy as np


class FilterList:
    """Adapter class for filters
    """
    # TODO #2
    def __init__(self):
        self.filters = []
        # Getting the absolute path for the directory in which all the filter modules are kept
        filters_modules_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "image_filters")
        filters_modules_list = os.listdir(filters_modules_path)

        # Iterating over each filter module, importing it and adding it to filters list
        for each_filter in filters_modules_list:

            # Checking if the file is a python file and in format: <filter name>_detector.py
            if each_filter.endswith(".py") and len(each_filter.split("_")) == 2:
                splitted_name = each_filter.split(".")
                module_name = splitted_name[0]
                class_name = "".join([_.title() for _ in module_name.split("_")])

                # Dynamically import the module
                module = __import__(f"PixelCraft.image_filters.{module_name}", fromlist=[class_name])
                # Get the class from the module
                filter_class = getattr(module, class_name)
                # Create an instance
                dummy_obj = filter_class()
                self.filters.append(dummy_obj)

    def get_filters(self):
        """ Function to get list of all the builtin filters

            :return: Returns list of filters
            :rtype: python list of filter objects
        """
        return self.filters
