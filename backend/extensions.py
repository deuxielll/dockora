from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import docker

db = SQLAlchemy()
bcrypt = Bcrypt()
client = docker.from_env()