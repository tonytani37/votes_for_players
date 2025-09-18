import os
from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId

app = Flask(__name__)

# --- MongoDB 接続 ---
# セキュリティのため、接続文字列は環境変数から取得することを強く推奨します
MONGO_URI = os.environ.get('MONGO_URI') 
if not MONO_URI:
    # 環境変数が設定されていない場合のフォールバック（開発用）
    # 本番環境では必ず環境変数を設定してください
    MONGO_URI = "mongodb+srv://YOUR_USER:<YOUR_PASSWORD>@yourcluster.mongodb.net/?retryWrites=true&w=majority"

client = MongoClient(MONGO_URI)
# 'mydatabase' の部分はご自身のデータベース名に置き換えてください
db = client['mydatabase'] 
# 'items' の部分はコレクション名（テーブルのようなもの）に置き換えてください
collection = db['items'] 

# --- APIエンドポイント ---

# 全てのアイテムを取得する (GET)
@app.route('/items', methods=['GET'])
def get_items():
    items = []
    # MongoDBの_idはObjectのため、JSONで返すには文字列に変換する必要がある
    for item in collection.find():
        item['_id'] = str(item['_id'])
        items.append(item)
    return jsonify(items)

# 新しいアイテムを追記する (POST)
@app.route('/items', methods=['POST'])
def add_item():
    item_data = request.get_json()
    if not item_data:
        return jsonify({"error": "Invalid data"}), 400
    
    # データベースにデータを挿入
    result = collection.insert_one(item_data)
    
    return jsonify({
        "message": "Item added successfully!",
        "inserted_id": str(result.inserted_id)
    }), 201

if __name__ == '__main__':
    app.run(debug=True)