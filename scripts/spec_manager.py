#!/usr/bin/env python3
"""
Spec-driven development manager for AI agents
Helps manage specifications, tasks, and implementation workflow
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import argparse
import shutil

class SpecManager:
    def __init__(self, project_root: Path = None):
        self.project_root = project_root or Path.cwd()
        self.specs_dir = self.project_root / "specs"
        self.tasks_dir = self.specs_dir / "tasks"
        
    def load_specification(self, spec_path: str) -> str:
        """Load and return specification content"""
        path = self.specs_dir / spec_path
        if not path.exists():
            raise FileNotFoundError(f"Specification not found: {path}")
        return path.read_text()
    
    def list_tasks(self, status: str = "backlog") -> List[str]:
        """List all tasks with given status"""
        status_dir = self.tasks_dir / status
        if not status_dir.exists():
            return []
        
        tasks = []
        for task_file in status_dir.glob("TASK-*.md"):
            tasks.append(task_file.name)
        return sorted(tasks)
    
    def get_task_details(self, task_id: str) -> Dict[str, Any]:
        """Get details about a specific task"""
        # Search in all status directories
        for status in ["backlog", "in-progress", "completed"]:
            status_dir = self.tasks_dir / status
            for task_file in status_dir.glob(f"{task_id}*.md"):
                content = task_file.read_text()
                
                # Parse task details from markdown
                details = {
                    "id": task_id,
                    "status": status,
                    "file": str(task_file),
                    "content": content
                }
                
                # Extract priority
                if "Priority: P0" in content:
                    details["priority"] = "P0"
                elif "Priority: P1" in content:
                    details["priority"] = "P1"
                elif "Priority: P2" in content:
                    details["priority"] = "P2"
                else:
                    details["priority"] = "P3"
                
                # Extract dependencies
                if "Depends on:" in content:
                    deps_line = [line for line in content.split('\n') 
                                if "Depends on:" in line][0]
                    deps = deps_line.split("Depends on:")[1].strip()
                    details["dependencies"] = deps
                
                return details
        
        raise ValueError(f"Task not found: {task_id}")
    
    def move_task(self, task_id: str, new_status: str) -> bool:
        """Move task to different status"""
        task = self.get_task_details(task_id)
        old_path = Path(task["file"])
        new_dir = self.tasks_dir / new_status
        new_path = new_dir / old_path.name
        
        # Create directory if needed
        new_dir.mkdir(parents=True, exist_ok=True)
        
        # Move the file
        shutil.move(str(old_path), str(new_path))
        
        print(f"Moved {task_id} from {task['status']} to {new_status}")
        return True
    
    def generate_implementation_prompt(self, task_id: str) -> str:
        """Create prompt for AI agent based on task spec"""
        task = self.get_task_details(task_id)
        
        prompt = f"""
# Implementation Task: {task_id}

## Task Specification
{task['content']}

## Context Files to Read
1. Architecture: specs/context/architecture.md
2. Constraints: specs/context/constraints.md  
3. Style Guide: specs/context/style-guide.md
4. Domain Glossary: specs/context/domain-glossary.md

## Implementation Instructions
1. Follow the technical approach exactly as specified
2. Write tests first (TDD approach)
3. Include comprehensive error handling
4. Follow the style guide for all code
5. Update documentation as needed

## Validation Requirements
- All acceptance criteria must be met
- Tests must pass with >80% coverage
- TypeScript must compile without errors
- ESLint must pass without warnings

Please implement this task following the specification exactly.
"""
        return prompt
    
    def validate_implementation(self, task_id: str, implementation_path: str) -> Dict[str, Any]:
        """Check if implementation meets acceptance criteria"""
        task = self.get_task_details(task_id)
        validation_results = {
            "task_id": task_id,
            "timestamp": datetime.now().isoformat(),
            "criteria_met": [],
            "criteria_failed": [],
            "warnings": []
        }
        
        # Parse acceptance criteria from task
        content = task["content"]
        criteria_section = False
        criteria = []
        
        for line in content.split('\n'):
            if "Acceptance Criteria" in line:
                criteria_section = True
                continue
            if criteria_section and line.strip().startswith("- [ ]"):
                criterion = line.strip()[5:].strip()
                criteria.append(criterion)
            elif criteria_section and line.strip() and not line.strip().startswith("-"):
                criteria_section = False
        
        # For now, return criteria list for manual validation
        validation_results["criteria"] = criteria
        validation_results["needs_manual_review"] = True
        
        return validation_results
    
    def update_task_status(self, task_id: str, status: str) -> bool:
        """Update the status of a task"""
        if status not in ["backlog", "in-progress", "completed"]:
            raise ValueError(f"Invalid status: {status}")
        
        return self.move_task(task_id, status)
    
    def create_progress_report(self) -> str:
        """Generate a progress report of all tasks"""
        report = "# Task Progress Report\n\n"
        report += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        
        # Count tasks by status
        backlog = self.list_tasks("backlog")
        in_progress = self.list_tasks("in-progress")
        completed = self.list_tasks("completed")
        
        report += "## Summary\n"
        report += f"- Backlog: {len(backlog)} tasks\n"
        report += f"- In Progress: {len(in_progress)} tasks\n"
        report += f"- Completed: {len(completed)} tasks\n"
        report += f"- Total: {len(backlog) + len(in_progress) + len(completed)} tasks\n\n"
        
        # Calculate completion percentage
        total = len(backlog) + len(in_progress) + len(completed)
        if total > 0:
            completion = (len(completed) / total) * 100
            report += f"**Completion: {completion:.1f}%**\n\n"
        
        # List tasks by status
        if in_progress:
            report += "## In Progress\n"
            for task in in_progress:
                task_id = task.split('-')[1]
                report += f"- {task}\n"
            report += "\n"
        
        if backlog:
            report += "## Backlog (Next Up)\n"
            for task in backlog[:5]:  # Show top 5
                task_id = task.split('-')[1]
                report += f"- {task}\n"
            if len(backlog) > 5:
                report += f"- ...and {len(backlog) - 5} more\n"
            report += "\n"
        
        if completed:
            report += "## Recently Completed\n"
            for task in completed[-5:]:  # Show last 5
                report += f"- ✅ {task}\n"
            report += "\n"
        
        return report

def main():
    parser = argparse.ArgumentParser(description="Spec-driven development manager")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # List tasks command
    list_parser = subparsers.add_parser("list", help="List tasks")
    list_parser.add_argument("--status", default="backlog", 
                            choices=["backlog", "in-progress", "completed"],
                            help="Task status to list")
    
    # Show task command
    show_parser = subparsers.add_parser("show", help="Show task details")
    show_parser.add_argument("task_id", help="Task ID (e.g., TASK-001)")
    
    # Move task command
    move_parser = subparsers.add_parser("move", help="Move task to different status")
    move_parser.add_argument("task_id", help="Task ID")
    move_parser.add_argument("status", choices=["backlog", "in-progress", "completed"],
                            help="New status")
    
    # Generate prompt command
    prompt_parser = subparsers.add_parser("prompt", help="Generate AI implementation prompt")
    prompt_parser.add_argument("task_id", help="Task ID")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate implementation")
    validate_parser.add_argument("task_id", help="Task ID")
    validate_parser.add_argument("--path", help="Implementation path")
    
    # Progress report command
    report_parser = subparsers.add_parser("report", help="Generate progress report")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    manager = SpecManager()
    
    try:
        if args.command == "list":
            tasks = manager.list_tasks(args.status)
            if tasks:
                print(f"\n{args.status.upper()} Tasks:")
                for task in tasks:
                    print(f"  - {task}")
            else:
                print(f"No tasks in {args.status}")
        
        elif args.command == "show":
            details = manager.get_task_details(args.task_id)
            print(f"\nTask: {details['id']}")
            print(f"Status: {details['status']}")
            print(f"Priority: {details.get('priority', 'Unknown')}")
            if 'dependencies' in details:
                print(f"Dependencies: {details['dependencies']}")
            print("\n--- Task Content ---")
            print(details['content'])
        
        elif args.command == "move":
            manager.move_task(args.task_id, args.status)
        
        elif args.command == "prompt":
            prompt = manager.generate_implementation_prompt(args.task_id)
            print(prompt)
        
        elif args.command == "validate":
            results = manager.validate_implementation(args.task_id, args.path)
            print(json.dumps(results, indent=2))
        
        elif args.command == "report":
            report = manager.create_progress_report()
            print(report)
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()