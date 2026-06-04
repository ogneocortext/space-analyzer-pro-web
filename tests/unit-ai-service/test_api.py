#!/usr/bin/env python3
"""
Test suite for Space Analyzer AI Service API endpoints.
"""

import pytest
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import tempfile
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, FileData, DirectoryAnalysis

client = TestClient(app)


class TestAuthentication:
    """Test authentication endpoints."""
    
    def test_get_token(self):
        """Test getting access token."""
        response = client.post("/auth/token", params={
            "username": "testuser",
            "password": "testpass"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        
    def test_verify_token(self):
        """Test token verification."""
        # First get a token
        token_response = client.post("/auth/token", params={
            "username": "testuser",
            "password": "testpass"
        })
        token = token_response.json()["access_token"]
        
        # Verify the token
        response = client.post("/auth/verify", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert "username" in data
        
    def test_invalid_token(self):
        """Test invalid token verification."""
        response = client.post("/auth/verify", headers={
            "Authorization": "Bearer invalid_token"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        
    def test_get_current_user(self):
        """Test getting current user info."""
        # First get a token
        token_response = client.post("/auth/token", params={
            "username": "testuser",
            "password": "testpass"
        })
        token = token_response.json()["access_token"]
        
        # Get user info
        response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "username" in data


class TestHealthEndpoints:
    """Test health check endpoints."""
    
    def test_root_endpoint(self):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert data["auth_required"] is True
        
    def test_health_endpoint(self):
        """Test health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestProtectedEndpoints:
    """Test that protected endpoints require authentication."""
    
    def test_models_status_without_auth(self):
        """Test models status endpoint without authentication."""
        response = client.get("/models/status")
        assert response.status_code == 403  # Should be unauthorized
        
    def test_predict_category_without_auth(self):
        """Test predict category endpoint without authentication."""
        file_data = {
            "path": "/test/file.txt",
            "name": "file.txt",
            "size": 1024,
            "extension": "txt",
            "modified_time": 1640995200
        }
        response = client.post("/predict/category", json=file_data)
        assert response.status_code == 403
        
    def test_predict_cleanup_without_auth(self):
        """Test predict cleanup endpoint without authentication."""
        analysis = {
            "files": [
                {
                    "path": "/test/file.txt",
                    "name": "file.txt",
                    "size": 1024,
                    "extension": "txt",
                    "modified_time": 1640995200
                }
            ],
            "path": "/test"
        }
        response = client.post("/predict/cleanup", json=analysis)
        assert response.status_code == 403


class TestFileCategorization:
    """Test file categorization endpoints."""
    
    def get_auth_headers(self):
        """Helper to get authentication headers."""
        token_response = client.post("/auth/token", params={
            "username": "testuser",
            "password": "testpass"
        })
        token = token_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_predict_category_text_file(self):
        """Test predicting category for text file."""
        file_data = FileData(
            path="/test/document.txt",
            name="document.txt",
            size=1024,
            extension="txt",
            modified_time=1640995200
        )
        
        response = client.post("/predict/category", 
                              json=file_data.dict(),
                              headers=self.get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert "path" in data
        assert "predicted_category" in data
        assert "confidence" in data
        assert "alternatives" in data
        
    def test_predict_category_code_file(self):
        """Test predicting category for code file."""
        file_data = FileData(
            path="/test/script.py",
            name="script.py",
            size=2048,
            extension="py",
            modified_time=1640995200
        )
        
        response = client.post("/predict/category", 
                              json=file_data.dict(),
                              headers=self.get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert data["predicted_category"] in ["code", "scripts"]
        
    def test_predict_batch_categories(self):
        """Test batch categorization."""
        files = [
            FileData(path="/test/file1.txt", name="file1.txt", size=1024, extension="txt", modified_time=1640995200),
            FileData(path="/test/file2.py", name="file2.py", size=2048, extension="py", modified_time=1640995200),
            FileData(path="/test/file3.jpg", name="file3.jpg", size=4096, extension="jpg", modified_time=1640995200)
        ]
        
        response = client.post("/predict/categories-batch", 
                              json=[f.dict() for f in files],
                              headers=self.get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data
        assert len(data["predictions"]) == 3


class TestCleanupPrediction:
    """Test cleanup prediction endpoints."""
    
    def get_auth_headers(self):
        """Helper to get authentication headers."""
        token_response = client.post("/auth/token", params={
            "username": "testuser",
            "password": "testpass"
        })
        token = token_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_predict_cleanup_basic(self):
        """Test basic cleanup prediction."""
        analysis = DirectoryAnalysis(
            files=[
                FileData(path="/test/old_file.txt", name="old_file.txt", size=1024, extension="txt", modified_time=1540995200),
                FileData(path="/test/new_file.txt", name="new_file.txt", size=2048, extension="txt", modified_time=1640995200)
            ],
            path="/test"
        )
        
        response = client.post("/predict/cleanup", 
                              json=analysis.dict(),
                              headers=self.get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should return recommendations for old files
        if data:
            assert "file_path" in data[0]
            assert "confidence" in data[0]
            assert "action" in data[0]
            assert "reason" in data[0]


class TestModelManagement:
    """Test model management endpoints."""
    
    def get_auth_headers(self):
        """Helper to get authentication headers."""
        token_response = client.post("/auth/token", params={
            "username": "testuser",
            "password": "testpass"
        })
        token = token_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_models_status(self):
        """Test getting models status."""
        response = client.get("/models/status", headers=self.get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # Should have at least categorizer and cleanup predictor
        
        for model in data:
            assert "model_name" in model
            assert "trained" in model
            assert "last_trained" in model
            
    @patch('main._train_categorizer_task')
    def test_train_categorizer(self, mock_train):
        """Test training categorizer."""
        files = [
            FileData(path="/test/file1.txt", name="file1.txt", size=1024, extension="txt", modified_time=1640995200, category="documents"),
            FileData(path="/test/file2.py", name="file2.py", size=2048, extension="py", modified_time=1640995200, category="code")
        ]
        
        response = client.post("/train/categorizer", 
                              json=[f.dict() for f in files],
                              headers=self.get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "files_count" in data
        assert data["files_count"] == 2
        
    @patch('main._train_cleanup_predictor_task')
    def test_train_cleanup_predictor(self, mock_train):
        """Test training cleanup predictor."""
        analyses = [
            DirectoryAnalysis(
                files=[FileData(path="/test/file1.txt", name="file1.txt", size=1024, extension="txt", modified_time=1540995200)],
                path="/test1"
            )
        ]
        
        response = client.post("/train/cleanup-predictor", 
                              json=[a.dict() for a in analyses],
                              headers=self.get_auth_headers())
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "analyses_count" in data


class TestErrorHandling:
    """Test error handling."""
    
    def get_auth_headers(self):
        """Helper to get authentication headers."""
        token_response = client.post("/auth/token", params={
            "username": "testuser",
            "password": "testpass"
        })
        token = token_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_invalid_file_data(self):
        """Test handling invalid file data."""
        invalid_data = {
            "path": "/test/file.txt",
            "name": "file.txt",
            # Missing required fields
        }
        
        response = client.post("/predict/category", 
                              json=invalid_data,
                              headers=self.get_auth_headers())
        assert response.status_code == 422  # Validation error
        
    def test_malformed_json(self):
        """Test handling malformed JSON."""
        response = client.post("/predict/category", 
                              data="not json",
                              headers=self.get_auth_headers())
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
