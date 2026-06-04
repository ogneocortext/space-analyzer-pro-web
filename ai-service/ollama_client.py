#!/usr/bin/env python3
"""
Robust Ollama API client with retry logic, model management, and performance tracking.
"""

import json
import time
import base64
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass, field, asdict


@dataclass
class OllamaResponse:
    """Structured response from Ollama API"""
    model: str
    prompt: str
    response: str
    total_duration_ms: int = 0
    load_duration_ms: int = 0
    eval_duration_ms: int = 0
    eval_count: int = 0
    tokens_per_second: float = 0.0
    success: bool = False
    error: str = ""


@dataclass
class ModelPerformance:
    """Track performance metrics for a model"""
    model_name: str
    total_queries: int = 0
    successful_queries: int = 0
    total_tokens: int = 0
    total_duration_ms: int = 0
    avg_response_time_ms: float = 0.0
    last_used: str = ""
    error_count: int = 0

    @property
    def success_rate(self) -> float:
        if self.total_queries == 0:
            return 0.0
        return self.successful_queries / self.total_queries

    @property
    def avg_tokens_per_second(self) -> float:
        if self.total_duration_ms <= 0:
            return 0.0
        return (self.total_tokens / self.total_duration_ms) * 1000


class OllamaClient:
    """Robust Ollama API client with retry logic and performance tracking."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        default_model: str = "phi4-mini:latest",
        max_retries: int = 3,
        retry_delay: float = 1.0,
        timeout: int = 300,
    ):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        self._performance: Dict[str, ModelPerformance] = {}
        self._available_models: List[str] = []
        self._last_check: float = 0

    @property
    def available_models(self) -> List[str]:
        """Get list of available models (cached for 30s)."""
        import time
        now = time.time()
        if now - self._last_check > 30 or not self._available_models:
            self._refresh_models()
        return self._available_models

    def _refresh_models(self) -> None:
        """Fetch available models from Ollama."""
        try:
            self._last_check = time.time()
            url = f"{self.base_url}/api/tags"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                self._available_models = [m["name"] for m in data.get("models", [])]
        except Exception as e:
            print(f"Warning: Failed to refresh models: {e}")
            self._available_models = []

    def _get_performance(self, model: str) -> ModelPerformance:
        """Get or create performance tracker for a model."""
        if model not in self._performance:
            self._performance[model] = ModelPerformance(model_name=model)
        return self._performance[model]

    def _make_request(
        self,
        endpoint: str,
        payload: Dict[str, Any],
        model: str,
        attempt: int = 1,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Make HTTP request to Ollama API with retry logic."""
        url = f"{self.base_url}/api/{endpoint}"
        data = json.dumps(payload).encode("utf-8")
        perf = self._get_performance(model)
        perf.total_queries += 1

        try:
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                elapsed_ms = (time.time() - t0) * 1000
                result = json.loads(resp.read().decode())

                perf.successful_queries += 1
                perf.total_duration_ms += elapsed_ms
                perf.avg_response_time_ms = perf.total_duration_ms / max(perf.successful_queries, 1)
                perf.last_used = time.strftime("%Y-%m-%d %H:%M:%S")

                if "eval_count" in result:
                    perf.total_tokens += result.get("eval_count", 0)
                    if result.get("eval_duration", 0) > 0:
                        perf.tokens_per_second = (
                            result["eval_count"] / result["eval_duration"] * 1000
                        )

                return result, None

        except urllib.error.HTTPError as e:
            error_msg = f"HTTP {e.code}: {e.read().decode()[:200]}"
            perf.error_count += 1
        except urllib.error.URLError as e:
            error_msg = f"URL Error: {e.reason}"
            perf.error_count += 1
        except json.JSONDecodeError as e:
            error_msg = f"JSON decode error: {e}"
            perf.error_count += 1
        except Exception as e:
            error_msg = f"Unexpected error: {type(e).__name__}: {e}"
            perf.error_count += 1

        # Retry logic
        if attempt < self.max_retries:
            wait = self.retry_delay * attempt
            print(f"  ⏳ Retrying {model} ({attempt}/{self.max_retries}) after {wait}s...")
            time.sleep(wait)
            return self._make_request(endpoint, payload, model, attempt + 1)

        return None, error_msg

    def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        system: Optional[str] = None,
        temperature: float = 0.3,
        num_predict: int = 500,
        stream: bool = False,
        num_ctx: Optional[int] = None,
        num_gpu: Optional[int] = None,
        num_thread: Optional[int] = None,
    ) -> OllamaResponse:
        """Generate text from Ollama model."""
        model = model or self.default_model
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
            },
        }

        # Add CUDA optimization parameters if provided
        options = payload["options"]
        if num_ctx is not None:
            options["num_ctx"] = num_ctx
        if num_gpu is not None:
            options["num_gpu"] = num_gpu
        if num_thread is not None:
            options["num_thread"] = num_thread

        result, error = self._make_request("chat", payload, model)

        response = OllamaResponse(
            model=model,
            prompt=prompt[:100] + "..." if len(prompt) > 100 else prompt,
            response="",
            success=result is not None,
            error=error or "",
        )

        if result:
            response.response = result.get("message", {}).get("content", "").strip()
            # Extract timing info from response
            if "total_duration" in result:
                response.total_duration_ms = result["total_duration"] // 1_000_000
            if "load_duration" in result:
                response.load_duration_ms = result["load_duration"] // 1_000_000
            if "eval_duration" in result and "eval_count" in result:
                response.eval_duration_ms = result["eval_duration"] // 1_000_000
                response.eval_count = result["eval_count"]
                if response.eval_duration_ms > 0:
                    response.tokens_per_second = response.eval_count / response.eval_duration_ms * 1000

        return response

    def analyze_image(
        self,
        image_path: str,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        num_predict: int = 512,
    ) -> OllamaResponse:
        """Analyze an image using Ollama vision model."""
        model = model or self.default_model

        try:
            with open(image_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode("utf-8")
        except Exception as e:
            return OllamaResponse(
                model=model,
                prompt=prompt[:100],
                success=False,
                error=f"Failed to read image: {e}",
            )

        messages = [
            {"role": "user", "content": prompt, "images": [img_b64]},
        ]

        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
            },
        }

        result, error = self._make_request("chat", payload, model)

        response = OllamaResponse(
            model=model,
            prompt=prompt[:100],
            success=result is not None,
            error=error or "",
        )

        if result:
            msg = result.get("message", {})
            response.response = msg.get("content", "").strip()
            if "total_duration" in result:
                response.total_duration_ms = result["total_duration"] // 1_000_000

        return response

    def check_server(self) -> bool:
        """Check if Ollama server is reachable."""
        try:
            url = f"{self.base_url}/api/tags"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except Exception:
            return False

    def get_performance_report(self) -> Dict[str, Any]:
        """Get performance report for all models."""
        report = {}
        for model, perf in self._performance.items():
            report[model] = {
                "total_queries": perf.total_queries,
                "successful_queries": perf.successful_queries,
                "error_count": perf.error_count,
                "success_rate": round(perf.success_rate * 100, 1),
                "avg_response_time_ms": round(perf.avg_response_time_ms, 1),
                "avg_tokens_per_second": round(perf.avg_tokens_per_second, 1),
                "last_used": perf.last_used,
            }
        return report

    def list_models(self) -> List[Dict[str, Any]]:
        """List available models with details."""
        try:
            url = f"{self.base_url}/api/tags"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                return data.get("models", [])
        except Exception as e:
            print(f"Error listing models: {e}")
            return []

    def show_model_info(self, model: str) -> Optional[Dict[str, Any]]:
        """Get detailed info about a specific model."""
        try:
            url = f"{self.base_url}/api/show"
            payload = json.dumps({"name": model}).encode()
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            print(f"Error showing model info for {model}: {e}")
            return None


# Convenience singleton
_client: Optional[OllamaClient] = None


def get_client() -> OllamaClient:
    """Get or create the global Ollama client."""
    global _client
    if _client is None:
        _client = OllamaClient()
    return _client


if __name__ == "__main__":
    import sys

    client = get_client()

    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "status":
            print(f"Server available: {client.check_server()}")
            print(f"Models: {client.available_models}")
        elif cmd == "perf":
            # Run a quick test
            resp = client.generate("Say hello in one word.", model=client.default_model)
            print(f"Response: {resp.response}")
            print(f"Duration: {resp.total_duration_ms}ms")
            print(f"Perf report: {json.dumps(client.get_performance_report(), indent=2)}")
        elif cmd == "models":
            for m in client.list_models():
                print(f"  {m['name']} ({m.get('size', 'N/A') / (1024**2):.1f} MB)")
        else:
            print(f"Unknown command: {cmd}")
    else:
        print("Ollama Client - Usage:")
        print("  python ollama_client.py status    - Check server and models")
        print("  python ollama_client.py perf      - Run quick performance test")
        print("  python ollama_client.py models    - List installed models")