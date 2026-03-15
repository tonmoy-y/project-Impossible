from flask import Flask,request,jsonify
from pymongo import MongoClient
import bcrypt
import jwt
import datetime
from functools import wraps

app = Flask(__name__)
app.config["SECRET_KEY"] = "secretkey123"
client = MongoClient("mongodb+srv://nafizBro:territoryrunner123@cluster0.xc2hh47.mongodb.net/?appName=Cluster0")
db = client["territory_runner_db"]
users_collection = db["users"]

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({
                "error": "Authorization header is missing"
            }),401

        try:
            token = auth_header.split(" ")[1]
            decoded_token = jwt.decode(
                token,
                app.config["SECRET_KEY"],
                algorithms=["HS256"]
            )
            return f(decoded_token, *args, **kwargs)
        
        except jwt.ExpiredSignatureError:
            return jsonify({
                "error": "Token has expired"
            }),401

        except jwt.InvalidTokenError:
            return jsonify({
                "error": "Invalid token"
            }),401
        
    return decorated

@app.route("/")
def hello():
    return "Hello, World!"

#signup route
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()

    full_name = data.get("fullName")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    confirm_password = data.get("confirmPassword")

    if not all([full_name, username, email, password, confirm_password]):
        return jsonify({
            "error":"All fields are required"
        }),400
    
    if password != confirm_password:
        return jsonify({
            "error": "Passwords do not match"
        }),400

    if users_collection.find_one({"username": username}):
        return jsonify({
            "error": "Username already exists"
        }),400

    if users_collection.find_one({"email": email}):
        return jsonify({
            "error": "Email already exists"
        }),400

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    user_data = {
        "full_name": full_name,
        "username": username,
        "email": email,
        "password_hash": hashed_password.decode("utf-8")
    }

    users_collection.insert_one(user_data)

    return jsonify({
        "message": "User registered successfully"
    }),201

#login route
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({
            "error": "Email and password are required"
        }),400

    user = users_collection.find_one({"email": email})

    if not user:
        return jsonify({
            "error": "User not found"
        }),404

    stored_hash_password = user["password_hash"]

    if not bcrypt.checkpw(password.encode("utf-8"), stored_hash_password.encode("utf-8")):
        return jsonify({
            "error": "Invalid password"
        }),401

    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)

    }

    token = jwt.encode(payload, app.config["SECRET_KEY"],algorithm="HS256")

    return jsonify({
        "message": "Login successfully ",
        "token": token
    }),200

#protectd route testing
@app.route("/api/protected", methods=["GET"])
@token_required
def profile(decoded_token):
    return jsonify({
        "message": "This is a protected route",
        "user": decoded_token
    }),200

    
if __name__ == "__main__":
    app.run(debug=True)