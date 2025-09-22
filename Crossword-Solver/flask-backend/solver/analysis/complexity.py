import time
from typing import Dict, List, Any

class ComplexityTracker:
    
    def __init__(self):
        self.operations_count = 0
        self.memory_usage = []
        self.start_time = 0
        self.operation_history = []
        
    def reset(self):
        """Reset all tracked metrics."""
        self.operations_count = 0
        self.memory_usage = []
        self.operation_history = []
        self.start_time = time.time()
        
    def increment_operations(self, count: int = 1):
        """Increment the operation count."""
        self.operations_count += count
        self.operation_history.append((time.time() - self.start_time, self.operations_count))
        
    def record_memory(self, memory_kb: int):
        """Record memory usage at this point in time."""
        self.memory_usage.append((time.time() - self.start_time, memory_kb))
        
    def time_complexity(self) -> Dict[str, Any]:
        """Calculate time complexity metrics."""
        if not self.operation_history:
            return {"big_o": "O(1)", "operations": 0, "growth_rate": 0}
            
        # Simple approximation of time complexity
        final_ops = self.operations_count
        final_time = self.operation_history[-1][0] if self.operation_history else 0
        
        # This is a simplified approach - in practice you'd need more sophisticated analysis
        if final_ops <= 1:
            complexity = "O(1)"
        elif final_ops <= final_time * 10:  # Arbitrary threshold
            complexity = "O(n)"
        elif final_ops <= final_time * final_time:
            complexity = "O(n^2)"
        else:
            complexity = "O(n^3) or higher"
            
        return {
            "big_o": complexity,
            "operations": final_ops,
            "growth_rate": final_ops / final_time if final_time > 0 else 0
        }
        
    def space_complexity(self) -> Dict[str, Any]:
        """Calculate space complexity metrics."""
        if not self.memory_usage:
            return {"big_o": "O(1)", "max_memory_kb": 0, "growth_rate": 0}
            
        max_memory = max(memory for _, memory in self.memory_usage) if self.memory_usage else 0
        
        if max_memory <= 100:  # Arbitrary threshold in KB
            complexity = "O(1)"
        elif max_memory <= 1000:
            complexity = "O(n)"
        else:
            complexity = "O(n^2) or higher"
            
        return {
            "big_o": complexity,
            "max_memory_kb": max_memory,
            "growth_rate": max_memory / len(self.memory_usage) if self.memory_usage else 0
        }