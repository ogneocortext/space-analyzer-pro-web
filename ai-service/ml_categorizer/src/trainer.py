"""
ML Model Trainer for File Categorization
Advanced training pipeline with deep learning and ensemble methods
"""

import os
import json
import pickle
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import asdict

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModel, AdamW
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

try:
    import spacy
    HAS_SPACY = True
except ImportError:
    HAS_SPACY = False
    print("Warning: spaCy not available. Advanced NLP disabled.")

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    print("Warning: tqdm not available. Progress bars disabled.")

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    print("Warning: tqdm not available. Progress bars disabled.")

from .categorizer import AdvancedFileCategorizer, FileFeatures, FileCategory

class FileDataset(Dataset):
    """PyTorch dataset for file classification"""
    
    def __init__(self, features: List[np.ndarray], labels: List[int]):
        self.features = features
        self.labels = labels
    
    def __len__(self):
        return len(self.features)
    
    def __getitem__(self, idx):
        return torch.FloatTensor(self.features[idx]), torch.LongTensor([self.labels[idx]])

class DeepClassifier(nn.Module):
    """Deep neural network for file classification"""
    
    def __init__(self, input_size: int, hidden_size: int, num_classes: int):
        super(DeepClassifier, self).__init__()
        
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size // 2)
        self.fc3 = nn.Linear(hidden_size // 2, num_classes)
        
        self.dropout = nn.Dropout(0.3)
        self.relu = nn.ReLU()
        self.batchnorm1 = nn.BatchNorm1d(hidden_size)
        self.batchnorm2 = nn.BatchNorm1d(hidden_size // 2)
    
    def forward(self, x):
        x = self.relu(self.batchnorm1(self.fc1(x)))
        x = self.dropout(x)
        x = self.relu(self.batchnorm2(self.fc2(x)))
        x = self.dropout(x)
        x = self.fc3(x)
        return x

class AdvancedModelTrainer:
    """Advanced model trainer with deep learning capabilities"""
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        # Initialize components
        self.categorizer = AdvancedFileCategorizer(model_dir)
        self.nlp = None
        
        # Training configuration
        self.config = {
            'test_size': 0.2,
            'random_state': 42,
            'cross_validation_folds': 5,
            'deep_learning_epochs': 50,
            'deep_learning_batch_size': 32,
            'learning_rate': 0.001,
        }
        
        # Model storage
        self.models = {}
        self.performance_metrics = {}
        
    def prepare_training_data(self, data_source: str) -> Tuple[List[FileFeatures], List[FileCategory]]:
        """Prepare training data from various sources"""
        print(f"Preparing training data from: {data_source}")
        
        if data_source == "synthetic":
            return self._generate_synthetic_data()
        elif data_source == "file_system":
            return self._collect_file_system_data()
        elif data_source.endswith(".json"):
            return self._load_json_data(data_source)
        else:
            raise ValueError(f"Unsupported data source: {data_source}")
    
    def _generate_synthetic_data(self) -> Tuple[List[FileFeatures], List[FileCategory]]:
        """Generate synthetic training data"""
        print("Generating synthetic training data...")
        
        features = []
        categories = []
        
        # Define patterns for each category
        category_patterns = {
            FileCategory.DOCUMENTS: [
                ("document.pdf", 1024000, "application/pdf"),
                ("report.docx", 512000, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                ("notes.txt", 10240, "text/plain"),
                ("presentation.pptx", 2048000, "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            ],
            FileCategory.IMAGES: [
                ("photo.jpg", 2048000, "image/jpeg"),
                ("icon.png", 16384, "image/png"),
                ("banner.gif", 102400, "image/gif"),
                ("design.svg", 8192, "image/svg+xml"),
            ],
            FileCategory.CODE: [
                ("script.py", 4096, "text/x-python"),
                ("app.js", 8192, "application/javascript"),
                ("style.css", 2048, "text/css"),
                ("config.json", 512, "application/json"),
            ],
            FileCategory.VIDEOS: [
                ("movie.mp4", 104857600, "video/mp4"),
                ("clip.avi", 52428800, "video/x-msvideo"),
                ("animation.gif", 2097152, "image/gif"),
            ],
            FileCategory.AUDIO: [
                ("song.mp3", 5242880, "audio/mpeg"),
                ("recording.wav", 2097152, "audio/wav"),
                ("podcast.m4a", 10485760, "audio/mp4"),
            ],
        }
        
        # Generate samples for each category
        samples_per_category = 100
        
        for category, patterns in category_patterns.items():
            for _ in range(samples_per_category):
                pattern = np.random.choice(patterns)
                filename, base_size, mime_type = pattern
                
                # Add variation to size
                size = int(base_size * np.random.uniform(0.1, 3.0))
                
                # Create file features
                feature = FileFeatures(
                    filename=filename,
                    extension=Path(filename).suffix.lower(),
                    size=size,
                    mime_type=mime_type,
                    is_hidden=False,
                    is_executable=False,
                    word_count=np.random.randint(100, 10000) if "text" in mime_type else 0,
                    char_count=np.random.randint(1000, 50000) if "text" in mime_type else 0,
                    language="english" if "text" in mime_type else "unknown",
                    image_width=np.random.randint(100, 4000) if "image" in mime_type else 0,
                    image_height=np.random.randint(100, 3000) if "image" in mime_type else 0,
                    image_channels=3 if "image" in mime_type else 0,
                    line_count=np.random.randint(50, 1000) if "code" in filename else 0,
                    function_count=np.random.randint(5, 100) if "code" in filename else 0,
                    import_count=np.random.randint(2, 50) if "code" in filename else 0,
                    creation_date=datetime.now(),
                    modification_date=datetime.now(),
                )
                
                features.append(feature)
                categories.append(category)
        
        print(f"Generated {len(features)} synthetic samples")
        return features, categories
    
    def _collect_file_system_data(self, directory: str = ".") -> Tuple[List[FileFeatures], List[FileCategory]]:
        """Collect training data from file system"""
        print(f"Collecting training data from directory: {directory}")
        
        features = []
        categories = []
        
        # Walk through directory
        for root, dirs, files in os.walk(directory):
            for file in files[:1000]:  # Limit to prevent memory issues
                file_path = Path(root) / file
                
                try:
                    # Extract features
                    feature = self.categorizer.extract_features(file_path)
                    
                    # Determine category using rules (for training data)
                    category = self.categorizer._rule_based_classification(feature)
                    
                    features.append(feature)
                    categories.append(category)
                    
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
                    continue
        
        print(f"Collected {len(features)} samples from file system")
        return features, categories
    
    def _load_json_data(self, json_path: str) -> Tuple[List[FileFeatures], List[FileCategory]]:
        """Load training data from JSON file"""
        print(f"Loading training data from JSON: {json_path}")
        
        features = []
        categories = []
        
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
            
            for item in data:
                # Convert JSON to FileFeatures
                feature = FileFeatures(**item['features'])
                category = FileCategory(item['category'])
                
                features.append(feature)
                categories.append(category)
        
        except Exception as e:
            print(f"Error loading JSON data: {e}")
            return [], []
        
        print(f"Loaded {len(features)} samples from JSON")
        return features, categories
    
    def extract_advanced_features(self, features: List[FileFeatures]) -> np.ndarray:
        """Extract advanced features for deep learning"""
        print("Extracting advanced features...")
        
        advanced_features = []
        
        for feature in features:
            # Basic features
            basic = [
                np.log1p(feature.size),  # Log transform size
                float(feature.is_hidden),
                float(feature.is_executable),
                len(feature.extension),
                len(feature.filename),
            ]
            
            # Text features
            text = [
                np.log1p(feature.word_count),
                np.log1p(feature.char_count),
                feature.word_count / max(feature.char_count, 1),  # Word density
                len(feature.content_preview),
                hash(feature.language) % 100,  # Language encoding
            ]
            
            # Code features
            code = [
                np.log1p(feature.line_count),
                np.log1p(feature.function_count),
                np.log1p(feature.import_count),
                feature.function_count / max(feature.line_count, 1),  # Function density
            ]
            
            # Image features
            image = [
                np.log1p(feature.image_width),
                np.log1p(feature.image_height),
                float(feature.image_channels),
                np.log1p(feature.image_width * feature.image_height),  # Pixel count
                hash(feature.image_hash) % 1000 if feature.image_hash else 0,
            ]
            
            # Time features
            time = [
                feature.creation_date.timestamp() if feature.creation_date else 0,
                feature.modification_date.timestamp() if feature.modification_date else 0,
            ]
            
            # Combine all features
            all_features = basic + text + code + image + time
            advanced_features.append(all_features)
        
        return np.array(advanced_features, dtype=np.float32)
    
    def train_traditional_models(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Train traditional ML models"""
        print("Training traditional ML models...")
        
        # Encode labels
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, 
            test_size=self.config['test_size'], 
            random_state=self.config['random_state'],
            stratify=y_encoded
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        models = {}
        performance = {}
        
        # Random Forest
        rf = RandomForestClassifier(n_estimators=100, random_state=self.config['random_state'])
        rf_scores = cross_val_score(rf, X_train_scaled, y_train, cv=self.config['cross_validation_folds'])
        rf.fit(X_train_scaled, y_train)
        rf_pred = rf.predict(X_test_scaled)
        
        models['random_forest'] = rf
        performance['random_forest'] = {
            'cv_score': rf_scores.mean(),
            'cv_std': rf_scores.std(),
            'test_accuracy': accuracy_score(y_test, rf_pred),
            'classification_report': classification_report(y_test, rf_pred, output_dict=True)
        }
        
        # Gradient Boosting
        gb = GradientBoostingClassifier(random_state=self.config['random_state'])
        gb_scores = cross_val_score(gb, X_train_scaled, y_train, cv=self.config['cross_validation_folds'])
        gb.fit(X_train_scaled, y_train)
        gb_pred = gb.predict(X_test_scaled)
        
        models['gradient_boosting'] = gb
        performance['gradient_boosting'] = {
            'cv_score': gb_scores.mean(),
            'cv_std': gb_scores.std(),
            'test_accuracy': accuracy_score(y_test, gb_pred),
            'classification_report': classification_report(y_test, gb_pred, output_dict=True)
        }
        
        # Ensemble
        ensemble = VotingClassifier([
            ('rf', models['random_forest']),
            ('gb', models['gradient_boosting'])
        ])
        ensemble.fit(X_train_scaled, y_train)
        ensemble_pred = ensemble.predict(X_test_scaled)
        
        models['ensemble'] = ensemble
        performance['ensemble'] = {
            'test_accuracy': accuracy_score(y_test, ensemble_pred),
            'classification_report': classification_report(y_test, ensemble_pred, output_dict=True)
        }
        
        return {
            'models': models,
            'performance': performance,
            'label_encoder': label_encoder,
            'scaler': scaler,
            'feature_names': self._get_feature_names()
        }
    
    def train_deep_model(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Train deep learning model"""
        print("Training deep learning model...")
        
        # Encode labels
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded,
            test_size=self.config['test_size'],
            random_state=self.config['random_state'],
            stratify=y_encoded
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Create datasets
        train_dataset = FileDataset(X_train_scaled, y_train.tolist())
        test_dataset = FileDataset(X_test_scaled, y_test.tolist())
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config['deep_learning_batch_size'],
            shuffle=True
        )
        test_loader = DataLoader(
            test_dataset,
            batch_size=self.config['deep_learning_batch_size'],
            shuffle=False
        )
        
        # Initialize model
        model = DeepClassifier(
            input_size=X_train_scaled.shape[1],
            hidden_size=128,
            num_classes=len(label_encoder.classes_)
        )
        
        criterion = nn.CrossEntropyLoss()
        optimizer = AdamW(model.parameters(), lr=self.config['learning_rate'])

        # Training loop
        model.train()
        train_losses = []

        for epoch in range(self.config['deep_learning_epochs']):
            epoch_loss = 0.0

            iterable = train_loader
            if HAS_TQDM:
                iterable = tqdm(train_loader, desc=f"Epoch {epoch+1}/{self.config['deep_learning_epochs']}")

            for batch_features, batch_labels in iterable:
                optimizer.zero_grad()
                outputs = model(batch_features)
                loss = criterion(outputs, batch_labels.squeeze())
                loss.backward()
                optimizer.step()

                epoch_loss += loss.item()

            avg_loss = epoch_loss / len(train_loader)
            train_losses.append(avg_loss)

            if (epoch + 1) % 10 == 0:
                print(f"Epoch {epoch+1}, Loss: {avg_loss:.4f}")

        # Evaluate model
        model.eval()
        correct = 0
        total = 0

        with torch.no_grad():
            for batch_features, batch_labels in test_loader:
                outputs = model(batch_features)
                _, predicted = torch.max(outputs.data, 1)
                total += batch_labels.size(0)
                correct += (predicted == batch_labels.squeeze()).sum().item()
        
        accuracy = correct / total
        
        return {
            'model': model,
            'scaler': scaler,
            'label_encoder': label_encoder,
            'train_losses': train_losses,
            'test_accuracy': accuracy,
            'feature_names': self._get_feature_names()
        }
    
    def _get_feature_names(self) -> List[str]:
        """Get feature names for interpretability"""
        return [
            # Basic features
            'log_size', 'is_hidden', 'is_executable', 'extension_len', 'filename_len',
            # Text features
            'log_word_count', 'log_char_count', 'word_density', 'content_preview_len', 'language_hash',
            # Code features
            'log_line_count', 'log_function_count', 'log_import_count', 'function_density',
            # Image features
            'log_image_width', 'log_image_height', 'image_channels', 'log_pixel_count', 'image_hash',
            # Time features
            'creation_timestamp', 'modification_timestamp'
        ]
    
    def train_full_pipeline(self, data_source: str = "synthetic") -> Dict[str, Any]:
        """Train complete pipeline with all models"""
        print("Starting full training pipeline...")
        
        # Prepare data
        features, categories = self.prepare_training_data(data_source)
        
        if len(features) < 100:
            raise ValueError("Insufficient training data. Need at least 100 samples.")
        
        # Extract advanced features
        X = self.extract_advanced_features(features)
        y = np.array([cat.value for cat in categories])
        
        print(f"Training with {len(features)} samples, {X.shape[1]} features")
        
        # Train traditional models
        traditional_results = self.train_traditional_models(X, y)
        
        # Train deep learning model
        deep_results = self.train_deep_model(X, y)
        
        # Combine results
        training_results = {
            'traditional_models': traditional_results,
            'deep_model': deep_results,
            'training_data_size': len(features),
            'feature_count': X.shape[1],
            'categories': list(set(categories)),
            'training_date': datetime.now().isoformat(),
            'data_source': data_source
        }
        
        # Save models
        self._save_all_models(training_results)
        
        # Generate report
        self._generate_training_report(training_results)
        
        print("Training pipeline completed successfully!")
        return training_results
    
    def _save_all_models(self, results: Dict[str, Any]):
        """Save all trained models"""
        print("Saving trained models...")
        
        # Save traditional models
        traditional = results['traditional_models']
        
        for model_name, model in traditional['models'].items():
            model_path = self.model_dir / f"{model_name}_classifier.pkl"
            with open(model_path, 'wb') as f:
                pickle.dump(model, f)
        
        # Save ensemble as main model
        ensemble_path = self.model_dir / "ensemble_classifier.pkl"
        with open(ensemble_path, 'wb') as f:
            pickle.dump(traditional['models']['ensemble'], f)
        
        # Save label encoder and scaler
        with open(self.model_dir / "label_encoder.pkl", 'wb') as f:
            pickle.dump(traditional['label_encoder'], f)
        
        with open(self.model_dir / "feature_scaler.pkl", 'wb') as f:
            pickle.dump(traditional['scaler'], f)
        
        # Save deep learning model
        deep = results['deep_model']
        torch.save(deep['model'], self.model_dir / "deep_classifier.pth")
        
        print("All models saved successfully!")
    
    def _generate_training_report(self, results: Dict[str, Any]):
        """Generate comprehensive training report"""
        print("Generating training report...")
        
        report = {
            'training_summary': {
                'data_source': results['data_source'],
                'training_data_size': results['training_data_size'],
                'feature_count': results['feature_count'],
                'training_date': results['training_date'],
                'categories_trained': len(results['categories'])
            },
            'model_performance': {},
            'feature_importance': {},
            'recommendations': []
        }
        
        # Add traditional model performance
        traditional = results['traditional_models']['performance']
        report['model_performance']['traditional'] = traditional
        
        # Add deep model performance
        report['model_performance']['deep_learning'] = {
            'test_accuracy': results['deep_model']['test_accuracy']
        }
        
        # Generate recommendations
        best_accuracy = 0
        best_model = None
        
        for model_name, perf in traditional.items():
            if perf['test_accuracy'] > best_accuracy:
                best_accuracy = perf['test_accuracy']
                best_model = model_name
        
        if results['deep_model']['test_accuracy'] > best_accuracy:
            best_model = 'deep_learning'
            best_accuracy = results['deep_model']['test_accuracy']
        
        report['recommendations'].append(f"Best performing model: {best_model} with accuracy: {best_accuracy:.3f}")
        
        if best_accuracy < 0.8:
            report['recommendations'].append("Consider collecting more training data to improve accuracy")
        
        # Save report
        report_path = self.model_dir / "training_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"Training report saved to: {report_path}")
        
        # Print summary
        print("\n" + "="*50)
        print("TRAINING SUMMARY")
        print("="*50)
        print(f"Data Source: {results['data_source']}")
        print(f"Training Samples: {results['training_data_size']}")
        print(f"Features: {results['feature_count']}")
        print(f"Categories: {len(results['categories'])}")
        print(f"\nBest Model: {best_model}")
        print(f"Best Accuracy: {best_accuracy:.3f}")
        print("="*50)

# Main training function
async def main():
    """Main training function"""
    trainer = AdvancedModelTrainer()
    
    # Train with synthetic data (for demo)
    results = trainer.train_full_pipeline("synthetic")
    
    print("\nTraining completed! Models are ready for use.")

if __name__ == "__main__":
    asyncio.run(main())