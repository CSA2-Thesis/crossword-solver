import matplotlib.pyplot as plt
from typing import Dict, List
from .complexity import ComplexityTracker

class ComplexityVisualizer:
    
    @staticmethod
    def plot_time_complexity(trackers: Dict[str, ComplexityTracker], title: str = "Time Complexity"):
        plt.figure(figsize=(10, 6))
        
        for algo_name, tracker in trackers.items():
            if tracker.operation_history:
                times, operations = zip(*tracker.operation_history)
                plt.plot(times, operations, label=algo_name, marker='o')
        
        plt.xlabel('Time (seconds)')
        plt.ylabel('Operations')
        plt.title(title)
        plt.legend()
        plt.grid(True)
        plt.show()
        
    @staticmethod
    def plot_space_complexity(trackers: Dict[str, ComplexityTracker], title: str = "Space Complexity"):
        plt.figure(figsize=(10, 6))
        
        for algo_name, tracker in trackers.items():
            if tracker.memory_usage:
                times, memory = zip(*tracker.memory_usage)
                plt.plot(times, memory, label=algo_name, marker='s')
        
        plt.xlabel('Time (seconds)')
        plt.ylabel('Memory Usage (KB)')
        plt.title(title)
        plt.legend()
        plt.grid(True)
        plt.show()
        
    @staticmethod
    def plot_combined_complexity(trackers: Dict[str, ComplexityTracker], title: str = "Time and Space Complexity"):
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
        
        for algo_name, tracker in trackers.items():
            if tracker.operation_history:
                times, operations = zip(*tracker.operation_history)
                ax1.plot(times, operations, label=algo_name, marker='o')
        
        ax1.set_ylabel('Operations')
        ax1.set_title('Time Complexity')
        ax1.legend()
        ax1.grid(True)
        
        for algo_name, tracker in trackers.items():
            if tracker.memory_usage:
                times, memory = zip(*tracker.memory_usage)
                ax2.plot(times, memory, label=algo_name, marker='s')
        
        ax2.set_xlabel('Time (seconds)')
        ax2.set_ylabel('Memory Usage (KB)')
        ax2.set_title('Space Complexity')
        ax2.legend()
        ax2.grid(True)
        
        plt.tight_layout()
        plt.show()