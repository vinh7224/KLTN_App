import sys
import bcrypt
from common import get_db, init_db


def hash_password(password: str) -> str:
    """Băm mật khẩu người dùng bằng bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_or_update_user(username: str, password: str, role: str):
    """Tạo mới hoặc cập nhật thông tin người dùng trong cơ sở dữ liệu"""
    init_db()
    conn = get_db()
    pw_hash = hash_password(password)
    
    conn.execute(
        """
        INSERT INTO users (username, pw_hash, role)
        VALUES (?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
            pw_hash = excluded.pw_hash,
            role = excluded.role
        """,
        (username, pw_hash, role),
    )
    conn.commit()
    conn.close()
    print(f"✅ Đã tạo/cập nhật tài khoản: '{username}' với vai trò '{role}'")


def main():
    if len(sys.argv) >= 4:
        username = sys.argv[1]
        password = sys.argv[2]
        role = sys.argv[3]
        create_or_update_user(username, password, role)
    else:
        print("Tạo tài khoản mặc định admin và viewer...")
        create_or_update_user("admin", "12345", "admin")
        create_or_update_user("viewer", "12345", "viewer")


if __name__ == "__main__":
    main()

