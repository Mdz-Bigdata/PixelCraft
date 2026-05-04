#!/usr/bin/env python
# -*- coding: utf-8 -*-
import re
import os
import sys
import setuptools
from distutils.core import Command

with open("README.md", "r", encoding='utf-8') as fh:
    long_description = fh.read()

# Support modern Python versions
network_folder_path = os.path.join(os.path.expanduser("~"), ".pixelcraft")
if not os.path.exists(network_folder_path):
    os.mkdir(network_folder_path)

# helper functions to make it easier to list dependencies not as a python list, but vertically w/ optional built-in comments to why a certain version of the dependency is listed
def cleanup(x):
    return re.sub(r" *#.*", "", x.strip())  # comments


def to_list(buffer):
    return list(filter(None, map(cleanup, buffer.splitlines())))


# normal dependencies ###
#
# these get resolved and installed via either of these two:
#
#   pip install pixelcraft
#   pip install -e .
#
# IMPORTANT: when updating these, please make sure to sync conda/meta.yaml
# 
# Important dependencies and their use:
# opencv-contrib-python: opencv library with contrib extension for image
#                        processing tasks
# image_ffmpeg: This module automatically installs ffmpeg binaries for use
#               in frames extraction from video
# ffmpy: Thin wrapper on top of ffmpeg binary for calling ffmpeg executables
#        using python, used in video duration calculation and frame extraction
#        from video
# requests: python requests library is used for downloading text detection model
#           if needed.
# scipy, scikit-learn, numpy, imutils are used for general io for images and
# and utilities
dep_groups = {
    "core": to_list(
        """
        scipy
        scikit-learn
        scikit-image
        opencv-contrib-python>=4.5.0
        numpy>=1.19
        imageio_ffmpeg>=0.2.0
        imutils
        requests
        psutil
        ffmpy
"""
    ),
    "ai": to_list(
        """
        torch>=2.0.0
        torchvision
        diffusers
        transformers
        accelerate
        pillow
"""
    )
}

# Get version info from PixelCraft/version.py location
__version__ = None # Explicitly set version.
exec(open('PixelCraft/version.py').read()) # loads __version__

requirements = dep_groups["core"]
setup_requirements = to_list(
    """
    pytest-runner
    setuptools>=45.0
"""
)


# test dependencies ###
test_requirements = to_list(
    """
    pytest
"""
)


setuptools.setup(
    name="pixelcraft",
    version=__version__,
    author="keplerlab",
    author_email="keplerwaasi@gmail.com",
    description="PixelCraft is a tool that automates video key/best frames extraction, video compression, image resizing, and AI-powered video generation.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/keplerlab/PixelCraft.git",
    packages=setuptools.find_packages(),
    install_requires=requirements,
    extras_require={
        "ai": dep_groups["ai"]
    },
    setup_requires=setup_requirements,
    tests_require=test_requirements,
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
        "Programming Language :: Python :: 3.14",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    project_urls={
        "Documentation": "https://pixelcraft.readthedocs.io",
        "Source": "https://github.com/keplerlab/PixelCraft",
        "Tracker": "https://github.com/keplerlab/PixelCraft/issues",
    },
    include_package_data=True,
    zip_safe=False,
)
