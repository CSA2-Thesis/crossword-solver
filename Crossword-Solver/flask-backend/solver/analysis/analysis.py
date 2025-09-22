import matlab.engine
import json
import tempfile
import os

class MatlabAnalyzer:
    def __init__(self):
        self.eng = None
        
    def start_engine(self):
        try:
            self.eng = matlab.engine.start_matlab()
            self.eng.addpath(self.eng.genpath('analysis/matlab_scripts'))
            return True
        except Exception as e:
            print(f"Error starting MATLAB engine: {e}")
            return False
            
    def stop_engine(self):
        """Stop MATLAB engine"""
        if self.eng:
            self.eng.quit()
            
    def analyze_performance(self, algorithm_data):
        """
        Analyze algorithm performance using MATLAB
        
        Args:
            algorithm_data: Dictionary containing algorithm performance metrics
            
        Returns:
            Dictionary with analysis results and visualization paths
        """
        if not self.eng:
            if not self.start_engine():
                return {"error": "MATLAB engine not available"}
        
        try:
            # Convert data to MATLAB compatible format
            matlab_data = self._prepare_data_for_matlab(algorithm_data)
            
            # Call MATLAB analysis function
            result = self.eng.analyze_crossword_performance(
                matlab_data, 
                nargout=1
            )
            
            # Convert MATLAB result to Python dictionary
            analysis_result = self._convert_matlab_result(result)
            
            return analysis_result
            
        except Exception as e:
            return {"error": f"MATLAB analysis failed: {str(e)}"}
    
    def _prepare_data_for_matlab(self, data):
        """Convert Python data to MATLAB compatible format"""
        # This will depend on your specific data structure
        # Example conversion:
        matlab_dict = self.eng.struct()
        
        for key, value in data.items():
            if isinstance(value, (list, tuple)):
                # Convert lists to MATLAB arrays
                matlab_dict[key] = matlab.double(value)
            else:
                matlab_dict[key] = value
                
        return matlab_dict
    
    def _convert_matlab_result(self, result):
        """Convert MATLAB result to Python dictionary"""
        # This will depend on what your MATLAB function returns
        # You might need to save results to files and read them back
        python_result = {}
        
        # Example: MATLAB returns a struct
        for field in self.eng.fieldnames(result):
            field_name = str(field)
            value = self.eng.getfield(result, field)
            
            # Convert MATLAB types to Python types
            if isinstance(value, matlab.double):
                python_result[field_name] = list(value)
            else:
                python_result[field_name] = str(value)
                
        return python_result