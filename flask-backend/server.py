from flask import Flask
from flask_cors import CORS  # Required for React to access the backend

app = Flask(__name__)
CORS(app)  # Enable CORS

@app.route("/members")
def members():
    return {"members": ["mem1", "mem2", "mem3"]}

if __name__ == "__main__":
    app.run(debug=True)
