"""
PostgreSQL-specific script to fix the token_blocklist table issue.
This ensures the table is properly created and accessible in PostgreSQL.
"""

import os
import psycopg2
from app import create_app
from extensions import db
from models.token_blocklist import TokenBlocklist

def fix_postgres_token_table():
    """Fix token_blocklist table issues in PostgreSQL."""
    app = create_app()
    with app.app_context():
        print("🔍 Diagnosing PostgreSQL token_blocklist issue...")
        
        # Get database connection info
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        print(f"Database URI: {db_uri}")
        
        # Check if we're actually using PostgreSQL
        if 'postgresql' not in db_uri:
            print("❌ Not using PostgreSQL! Current database:", db_uri)
            return
        
        try:
            # First, let's check the raw PostgreSQL connection
            print("\n📋 Checking raw PostgreSQL connection...")
            
            # Parse connection details from URI
            import re
            match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)', db_uri)
            if match:
                user, password, host, port, dbname = match.groups()
                
                # Test direct PostgreSQL connection
                conn = psycopg2.connect(
                    host=host,
                    port=port,
                    user=user,
                    password=password,
                    database=dbname,
                    sslmode='require'
                )
                
                cursor = conn.cursor()
                
                # Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'token_blocklist'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                print(f"✅ Direct PostgreSQL connection successful")
                print(f"📊 token_blocklist table exists: {table_exists}")
                
                if not table_exists:
                    print("\n🔧 Creating token_blocklist table...")
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS token_blocklist (
                            id SERIAL PRIMARY KEY,
                            jti VARCHAR(36) NOT NULL,
                            type VARCHAR(16) NOT NULL,
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_blocklist_jti ON token_blocklist(jti);")
                    conn.commit()
                    print("✅ token_blocklist table created successfully")
                
                # Verify the table structure
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'token_blocklist'
                    ORDER BY ordinal_position;
                """)
                columns = cursor.fetchall()
                print("\n📋 Table structure:")
                for col_name, data_type, is_nullable in columns:
                    print(f"  - {col_name}: {data_type} (nullable: {is_nullable})")
                
                cursor.close()
                conn.close()
                
            else:
                print("❌ Could not parse PostgreSQL URI")
                return
                
        except Exception as e:
            print(f"❌ PostgreSQL connection error: {e}")
            return
        
        # Now test with SQLAlchemy
        print("\n🔍 Testing SQLAlchemy connection...")
        try:
            # Force SQLAlchemy to recreate the table
            print("🔧 Ensuring SQLAlchemy tables are created...")
            db.create_all()
            
            # Test a simple query
            print("🧪 Testing TokenBlocklist query...")
            result = TokenBlocklist.query.filter_by(jti='test-jti-12345').first()
            print("✅ SQLAlchemy query successful (no token found, which is expected)")
            
            # Test insert/delete to verify the table works
            print("🧪 Testing insert/delete operations...")
            from datetime import datetime
            test_token = TokenBlocklist(
                jti='test-jti-12345',
                type='access',
                created_at=datetime.utcnow()
            )
            db.session.add(test_token)
            db.session.commit()
            print("✅ Insert successful")
            
            # Clean up test token
            db.session.delete(test_token)
            db.session.commit()
            print("✅ Delete successful")
            
            print("\n🎉 PostgreSQL token_blocklist table is working correctly!")
            
        except Exception as e:
            print(f"❌ SQLAlchemy error: {e}")
            print("🔧 Attempting to fix...")
            
            # Try to drop and recreate the table
            try:
                db.engine.execute("DROP TABLE IF EXISTS token_blocklist CASCADE;")
                TokenBlocklist.__table__.create(db.engine)
                print("✅ Table recreated successfully")
                
                # Test again
                result = TokenBlocklist.query.filter_by(jti='test-jti-12345').first()
                print("✅ Table is now working!")
                
            except Exception as e2:
                print(f"❌ Could not fix table: {e2}")

if __name__ == '__main__':
    fix_postgres_token_table() 