import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = 'dev'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///synergysphere.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

