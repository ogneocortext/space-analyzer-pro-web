#!/usr/bin/env python3
"""
Automated Interactive Testing Feedback Loop for Space Analyzer
=============================================================
Orchestrates the full analysis pipeline:
1. Capture screenshots (via macro)
2. Analyze with Ollama vision models
3. Extract quality metrics
4. Compare with previous iterations
5. Generate improvement suggestions
6. Track changes over time

Usage:
    python automated_feedback_loop.py                    # Full cycle
    python automated_feedback_loop.py --analyze-only     # Skip macro, just analyze
    python automated_feedback_loop.py --model qwen3-vl:4b
    python automated_feedback_loop.py --compare          # Compare two runs
"""

import argparse
import json
import os
import sys
import time
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict

# Add ai-service to path
sys.path.insert(0, str(Path(__file__).parent / "ai-service"))
from ollama_client import OllamaClient, get_client

# Configuration
DEFAULT_MODEL = "qwen3-vl:4b"
FAST_MODEL = "phi4-mini:latest"
BACKUP_MODEL = "llava:7b"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
FEEDBACK_DIR = Path("feedback_loop")
SCREENSHOTS_DIR = Path("macro_logs")
ANALYSIS_DIR = Path("analysis_results")


@dataclass
class AnalysisResult:
    """Structured analysis result for a single screenshot."""
    screenshot: str
    path: str
    model: str
    prompt: str
    response: str
    quality_score: float = 0.0
    improvement_suggestions: List[str] = None
    ratings: Dict[str, float] = None
    processing_time_ms: float = 0.0
    success: bool = False
    error: str = ""

    def __post_init__(self):
        if self.improvement_suggestions is None:
            self.improvement_suggestions = []
        if self.ratings is None:
            self.ratings = {}


@dataclass
class FeedbackCycle:
    """One complete cycle of analysis and feedback."""
    cycle_id: str
    timestamp: str
    model: str
    screenshot_count: int
    average_score: float
    total_suggestions: int
    improvements_over_previous: int = 0
    regressions_over_previous: int = 0
    results: List[AnalysisResult] = None

    def __post_init__(self):
        if self.results is None:
            self.results = []


class FeedbackLoopManager:
    """Manages the complete feedback loop for UI analysis."""

    def __init__(self, model: str = DEFAULT_MODEL, host: str = OLLAMA_HOST):
        self.model = model
        self.fast_model = FAST_MODEL
        self.ollama = OllamaClient(base_url=host, default_model=model)
        self.cycle_history: List[FeedbackCycle] = []
        self.current_cycle: Optional[FeedbackCycle] = None

        # Ensure directories exist
        FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
        ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    def check_environment(self) -> Dict[str, Any]:
        """Check the testing environment."""
        env = {
            "ollama_available": False,
            "model_available": False,
            "screenshots_available": False,
            "models_installed": [],
        }

        # Check Ollama
        if self.ollama.check_server():
            env["ollama_available"] = True
            env["models_installed"] = self.ollama.available_models

            # Check if primary model is available
            if self.model in env["models_installed"]:
                env["model_available"] = True
            elif self.fast_model in env["models_installed"]:
                print(f"  ⚠️ Primary model '{self.model}' not found, using '{self.fast_model}'")
                self.model = self.fast_model
                env["model_available"] = True
            elif env["models_installed"]:
                self.model = env["models_installed"][0]
                print(f"  ⚠️ No preferred model found, using '{self.model}'")
                env["model_available"] = True

        # Check screenshots
        screenshots = self._get_latest_screenshots()
        env["screenshots_available"] = len(screenshots) > 0
        env["screenshot_count"] = len(screenshots)

        return env

    def _get_latest_screenshots(self) -> List[Path]:
        """Get the latest set of screenshots."""
        dirs = sorted(
            [d for d in SCREENSHOTS_DIR.iterdir() if d.is_dir() and d.name.startswith("screenshots_")],
            reverse=True,
        )
        if not dirs:
            return []
        return sorted(dirs[0].glob("*.png"))

    def _extract_ratings(self, text: str) -> Dict[str, float]:
        """Extract numeric ratings from analysis text."""
        import re
        ratings = {}
        for match in re.finditer(r"(\w[\w\s'-]+?)\s*[:\-]\s*(\d+(?:\.\d+)?)\s*/\s*10", text):
            key = match.group(1).strip().lower().replace(" ", "_")
            ratings[key] = float(match.group(2))
        return ratings

    def _extract_suggestions(self, text: str) -> List[str]:
        """Extract improvement suggestions from analysis text."""
        import re
        suggestions = []
        patterns = [
            r"(?:suggestion|improvement|fix|recommend|change|consider)[:\s]*\n?\s*[\-\*•]?\s*(.+)",
            r"(?:top|best|key)\s+\d+\s+(?:improvement|suggestion|fix)\s*[:\s]*\n?\s*[\-\*•]?\s*(.+)",
        ]
        for line in text.split("\n"):
            line = line.strip().lstrip("-*•0123456789. ")
            if any(kw in line.lower() for kw in ["suggest", "improov", "fix", "recommend", "change", "consider", "should", "could", "try"]):
                if len(line) > 15:
                    suggestions.append(line)
        return suggestions[:5]

    def _compute_quality_score(self, text: str, ratings: Dict[str, float]) -> float:
        """Compute an overall quality score from analysis."""
        if ratings:
            return sum(ratings.values()) / len(ratings)

        # Fallback: look for score mentions
        import re
        scores = re.findall(r"(\d+(?:\.\d+)?)\s*/\s*10", text)
        if scores:
            return sum(float(s) for s in scores) / len(scores)
        return 50.0  # Neutral default

    def run_analysis(
        self,
        screenshots: List[Path],
        model: Optional[str] = None,
    ) -> List[AnalysisResult]:
        """Analyze a list of screenshots."""
        model = model or self.model
        results = []

        # Per-page prompts
        page_prompts = {
            "dashboard": "Analyze this dark-theme dashboard. Rate layout, readability, color contrast (1-10 each). List 3 specific improvements and 2 strengths.",
            "files": "Analyze this file analysis view. Evaluate stats clarity, grouping logic, and UI layout (1-10 each). Suggest 3 concrete improvements.",
            "charts": "Analyze these charts. Rate readability, axis labels, color contrast, and data clarity (1-10 each). Suggest specific improvements for dark theme.",
            "history": "Analyze this scan history list. Evaluate organization, navigation, and information density (1-10 each). List 2 improvements.",
            "settings": "Analyze this settings page. Evaluate form layout, field clarity, and navigation (1-10 each). Suggest 3 improvements.",
            "about": "Analyze this About screen. Evaluate information hierarchy and polish (1-10). Suggest 2 improvements.",
        }

        for idx, screenshot in enumerate(screenshots, 1):
            stem = screenshot.stem
            # Determine category from filename
            category = "general"
            for key in page_prompts:
                if key in stem.lower():
                    category = key
                    break

            prompt = page_prompts.get(category, "Analyze this screenshot of the application. Rate quality 1-10 and suggest improvements.")

            print(f"  [{idx}/{len(screenshots)}] Analyzing {screenshot.name} ({category})...", end=" ", flush=True)

            response = self.ollama.analyze_image(
                image_path=str(screenshot),
                prompt=prompt,
                model=model,
                temperature=0.2,
                num_predict=768,
            )

            if response.success:
                ratings = self._extract_ratings(response.response)
                score = self._compute_quality_score(response.response, ratings)
                suggestions = self._extract_suggestions(response.response)

                result = AnalysisResult(
                    screenshot=screenshot.name,
                    path=str(screenshot),
                    model=model,
                    prompt=prompt,
                    response=response.response,
                    quality_score=score,
                    improvement_suggestions=suggestions,
                    ratings=ratings,
                    processing_time_ms=response.total_duration_ms,
                    success=True,
                )
                print(f"✓ Score: {score:.1f}/100 ({response.total_duration_ms}ms)")
            else:
                result = AnalysisResult(
                    screenshot=screenshot.name,
                    path=str(screenshot),
                    model=model,
                    prompt=prompt,
                    response="",
                    success=False,
                    error=response.error,
                )
                # Try fallback model
                if model != self.fast_model:
                    print(f"✗ ({response.error}), retrying with {self.fast_model}...")
                    return self.run_analysis(screenshots, model=self.fast_model)
                print(f"✗ {response.error}")

            results.append(result)

        return results

    def generate_summary(
        self,
        results: List[AnalysisResult],
        model: Optional[str] = None,
    ) -> str:
        """Generate summary of all analysis results."""
        model = model or self.model
        total_score = 0
        count = 0
        all_suggestions = []

        for r in results:
            if r.success:
                total_score += r.quality_score
                count += 1
                all_suggestions.extend(r.improvement_suggestions)

        avg_score = total_score / max(count, 1)

        # Deduplicate suggestions
        seen = set()
        unique_suggestions = []
        for s in all_suggestions:
            key = s.lower().strip()[:50]
            if key not in seen:
                seen.add(key)
                unique_suggestions.append(s)

        # Build summary prompt for cross-page analysis
        prompt = (
            f"Based on analysis of {count} screenshots of a Rust/egui disk space analyzer app, "
            f"the average quality score is {avg_score:.1f}/100.\n\n"
            f"Key issues identified:\n"
        )
        for i, s in enumerate(unique_suggestions[:10], 1):
            prompt += f"{i}. {s}\n"

        prompt += (
            f"\nProvide:\n"
            f"1. Top 3 cross-cutting UI improvements (affecting multiple pages)\n"
            f"2. Top 3 page-specific fixes\n"
            f"3. Priority order for all improvements\n"
            f"4. Overall estimated UX improvement if all are implemented\n"
            f"Format as numbered lists."
        )

        response = self.ollama.generate(prompt=prompt, model=model, temperature=0.3, num_predict=512)

        summary = f"=== Auto-Generated Summary ===\n\n"
        summary += f"Pages Analyzed: {count}\n"
        summary += f"Average Quality Score: {avg_score:.1f}/100\n"
        summary += f"Unique Suggestions: {len(unique_suggestions)}\n\n"
        summary += f"--- Cross-Page Analysis ---\n"
        summary += response.response if response.success else "Summary generation failed"
        summary += f"\n\n--- All Suggestions ---\n"
        for i, s in enumerate(unique_suggestions, 1):
            summary += f"{i}. {s}\n"

        return summary

    def compare_with_previous(self, current_result: FeedbackCycle) -> Dict[str, Any]:
        """Compare current cycle with previous cycles."""
        comparison = {
            "improvements": [],
            "regressions": [],
            "trend": "stable",
            "score_history": [],
        }

        if len(self.cycle_history) == 0:
            return comparison

        prev_cycle = self.cycle_history[-1]
        score_diff = current_cycle.average_score - prev_cycle.average_score

        comparison["score_history"] = [c.average_score for c in self.cycle_history] + [current_cycle.average_score]
        comparison["previous_score"] = prev_cycle.average_score
        comparison["current_score"] = current_cycle.average_score
        comparison["change"] = round(score_diff, 2)

        if score_diff > 2:
            comparison["trend"] = "improving"
        elif score_diff < -2:
            comparison["trend"] = "regressing"

        # Per-screenshot comparison
        prev_results = {r.screenshot: r for r in prev_cycle.results}
        for curr_result in current_result.results:
            if curr_result.success and curr_result.screenshot in prev_results:
                prev = prev_results[curr_result.screenshot]
                if prev.success:
                    diff = curr_result.quality_score - prev.quality_score
                    entry = {
                        "screenshot": curr_result.screenshot,
                        "previous": prev.quality_score,
                        "current": curr_result.quality_score,
                        "change": round(diff, 1),
                    }
                    if diff > 1:
                        comparison["improvements"].append(entry)
                    elif diff < -1:
                        comparison["regressions"].append(entry)

        return comparison

    def save_cycle(self, cycle: FeedbackCycle) -> Path:
        """Save cycle results to disk."""
        cycle_file = FEEDBACK_DIR / f"cycle_{cycle.cycle_id}.json"
        data = asdict(cycle)
        cycle_file.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

        # Also update the latest symlink/content
        latest_file = FEEDBACK_DIR / "latest_cycle.json"
        latest_file.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

        print(f"  📄 Cycle saved -> {cycle_file}")
        return cycle_file

    def save_summary(self, summary: str, cycle_id: str) -> Path:
        """Save summary text."""
        summary_file = ANALYSIS_DIR / f"summary_{cycle_id}.md"
        summary_file.parent.mkdir(parents=True, exist_ok=True)
        summary_file.write_text(summary, encoding="utf-8")
        print(f"  📝 Summary saved -> {summary_file}")
        return summary_file

    def run_cycle(
        self,
        screenshots: Optional[List[Path]] = None,
        model: Optional[str] = None,
    ) -> FeedbackCycle:
        """Run one complete feedback cycle."""
        model = model or self.model
        cycle_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        print(f"\n{'='*60}")
        print(f"  🔄 FEEDBACK CYCLE: {cycle_id}")
        print(f"  Model: {model}")
        print(f"{'='*60}\n")

        # Get screenshots
        if screenshots is None:
            screenshots = self._get_latest_screenshots()
            if not screenshots:
                print("  ❌ No screenshots found. Run gui_macro_test.py first.")
                sys.exit(1)

        print(f"  📸 Found {len(screenshots)} screenshots\n")

        # Analyze
        results = self.run_analysis(screenshots, model=model)

        # Compute metrics
        successful = [r for r in results if r.success]
        avg_score = sum(r.quality_score for r in successful) / max(len(successful), 1)
        total_suggestions = sum(len(r.improvement_suggestions) for r in successful)

        # Create cycle
        cycle = FeedbackCycle(
            cycle_id=cycle_id,
            timestamp=datetime.now().isoformat(),
            model=model,
            screenshot_count=len(screenshots),
            average_score=round(avg_score, 2),
            total_suggestions=total_suggestions,
            results=results,
        )

        # Compare with previous
        comparison = self.compare_with_previous(cycle)
        cycle.improvements_over_previous = len(comparison["improvements"])
        cycle.regressions_over_previous = len(comparison["regressions"])

        # Generate summary
        summary = self.generate_summary(results, model=model)

        # Save
        self.save_cycle(cycle)
        self.save_summary(summary, cycle_id)
        self.cycle_history.append(cycle)
        self.current_cycle = cycle

        # Print report
        self._print_report(cycle, comparison)

        return cycle

    def _print_report(self, cycle: FeedbackCycle, comparison: Dict):
        """Print formatted cycle report."""
        print(f"\n{'='*60}")
        print(f"  📊 CYCLE REPORT: {cycle.cycle_id}")
        print(f"{'='*60}")
        print(f"  Screenshots analyzed: {cycle.screenshot_count}")
        print(f"  Average quality score: {cycle.average_score}/100")
        print(f"  Total suggestions: {cycle.total_suggestions}")
        print(f"  Improvements vs previous: {cycle.improvements_over_previous}")
        print(f"  Regressions vs previous: {cycle.regressions_over_previous}")
        print(f"  Trend: {comparison.get('trend', 'N/A').upper()}")

        if comparison.get("improvements"):
            print(f"\n  📈 Improvements:")
            for item in comparison["improvements"]:
                print(f"    + {item['screenshot']}: {item['previous']} → {item['current']} (+{item['change']})")

        if comparison.get("regressions"):
            print(f"\n  📉 Regressions:")
            for item in comparison["regressions"]:
                print(f"    - {item['screenshot']}: {item['previous']} → {item['current']} ({item['change']})")

        print(f"\n{'='*60}")

    def run_iterative_cycles(
        self,
        num_cycles: int = 3,
        delay_seconds: float = 5.0,
        model: Optional[str] = None,
    ):
        """Run multiple feedback cycles with delays (for automated testing)."""
        model = model or self.model

        print(f"\n🚀 Starting {num_cycles} iterative feedback cycles")
        print(f"   Model: {model}")
        print(f"   Delay between cycles: {delay_seconds}s")

        # Check environment first
        env = self.check_environment()
        if not env["ollama_available"]:
            print("  ❌ Ollama server not running. Start it first: ollama serve")
            sys.exit(1)
        if not env["screenshots_available"]:
            print("  ❌ No screenshots found. Run gui_macro_test.py first.")
            sys.exit(1)

        for i in range(num_cycles):
            print(f"\n▶ Cycle {i+1}/{num_cycles}")
            self.run_cycle(model=model)

            if i < num_cycles - 1:
                print(f"\n  ⏳ Waiting {delay_seconds}s before next cycle...")
                time.sleep(delay_seconds)

        # Final report
        print(f"\n{'='*60}")
        print(f"  🏁 FINAL FEEDBACK REPORT")
        print(f"{'='*60}")
        print(f"  Total cycles: {len(self.cycle_history)}")
        scores = [c.average_score for c in self.cycle_history]
        print(f"  First score: {scores[0]:.1f}")
        print(f"  Final score: {scores[-1]:.1f}")
        print(f"  Overall change: {scores[-1] - scores[0]:+.1f}")
        if len(scores) > 1:
            trend = "📈 Improving" if scores[-1] > scores[0] else "📉 Declining"
            print(f"  Trend: {trend}")
        print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="Automated feedback loop for Space Analyzer UI quality analysis"
    )
    parser.add_argument("--analyze-only", action="store_true",
                        help="Skip macro capture, just analyze existing screenshots")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"Ollama vision model to use (default: {DEFAULT_MODEL})")
    parser.add_argument("--cycles", type=int, default=1,
                        help="Number of feedback cycles to run (default: 1)")
    parser.add_argument("--delay", type=float, default=5.0,
                        help="Delay between cycles in seconds (default: 5)")
    parser.add_argument("--compare", action="store_true",
                        help="Compare results from two most recent cycles")
    parser.add_argument("--fast", action="store_true",
                        help=f"Use fast model ({FAST_MODEL})")
    parser.add_argument("--host", default=OLLAMA_HOST,
                        help=f"Ollama host URL (default: {OLLAMA_HOST})")

    args = parser.parse_args()

    model = FAST_MODEL if args.fast else args.model

    manager = FeedbackLoopManager(model=model, host=args.host)

    # Environment check
    env = manager.check_environment()
    if not env["ollama_available"]:
        print(f"\n❌ Ollama server not running at {args.host}")
        print("   Start it with: ollama serve")
        sys.exit(1)

    print(f"  ✅ Ollama server running ({len(env['models_installed'])} models installed)")

    if args.analyze_only:
        # Just analyze existing screenshots
        cycle = manager.run_cycle(model=model)
    elif args.compare:
        # Compare last two cycles
        if len(manager.cycle_history) < 2:
            print("  Need at least 2 cycles to compare. Running 2 cycles first...")
            manager.run_iterative_cycles(2, args.delay, model)
        else:
            manager.run_cycle(model=model)
            if len(manager.cycle_history) >= 2:
                c1 = manager.cycle_history[-2]
                c2 = manager.cycle_history[-1]
                print(f"\n  Comparing {c1.cycle_id} ({c1.average_score}) vs {c2.cycle_id} ({c2.average_score})")
    else:
        # Full feedback loop
        manager.run_iterative_cycles(args.cycles, args.delay, model)

    print("\n✅ Feedback loop complete!")


if __name__ == "__main__":
    main()