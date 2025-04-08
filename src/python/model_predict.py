import sys
import pickle
import json
import os
import traceback
import re

def predict_next_word(model, context, n=3):
    """Generalized prediction function that works with any model"""
    context = context[-n+1:] if len(context) > 0 else []
    
    if len(context) > 0:
        predictions = model.context_counts(model.vocab.lookup(context))
        return sorted(predictions.items(), key=lambda x: -x[1])[:5]
    else:
        # Handle empty context case
        return [("nop", 1)]

# Helper function to convert single-quoted JSON to valid double-quoted JSON
def fix_json_quotes(json_str):
    try:
        # First attempt to parse as-is
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError:
        # If that fails, attempt to fix quotes
        try:
            # Replace single quotes with double quotes for property names and values
            # This regex handles nested structures and arrays 
            # First convert the entire string to use double quotes
            fixed = json_str.replace("'", '"')
            
            # Test if the fixed JSON is valid
            json.loads(fixed)
            return fixed
        except json.JSONDecodeError:
            # If still not valid JSON, return original to get the original error
            return json_str

try:
    # Get input from command line
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No input provided"}))
        sys.exit(1)
        
    # Get the raw input
    input_arg = sys.argv[1]
    
    # Check if input is a file path (starts with @)
    if input_arg.startswith('@'):
        file_path = input_arg[1:]  # Remove the @ symbol
        print(f"Reading input from file: {file_path}", file=sys.stderr)
        
        try:
            with open(file_path, 'r') as f:
                input_arg = f.read()
            print(f"Input from file: {repr(input_arg)}", file=sys.stderr)
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            print(json.dumps({"success": False, "error": f"Error reading input file: {str(e)}"}))
            sys.exit(1)
    
    # Debug the raw input
    print(f"Raw input: {input_arg}", file=sys.stderr)
    
    # Pre-process input to handle quote issues
    # Windows command line often has issues with quotes
    input_json = fix_json_quotes(input_arg)
    
    # Debug the processed input
    print(f"Processed input: {input_json}", file=sys.stderr)
    
    try:
        data = json.loads(input_json)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        print(f"Input was: {input_json}", file=sys.stderr)
        print(json.dumps({"success": False, "error": f"JSON decode error: {str(e)}"}))
        sys.exit(1)
    
    # Get model type and context from input
    model_type = data.get('model', '8051')  # Default to 8051 if not specified
    context = data.get('context', [])
    
    # Validate model type
    supported_models = ['8051', '8085']
    if model_type not in supported_models:
        print(f"Unsupported model type: {model_type}. Using default 8051.", file=sys.stderr)
        model_type = '8051'
    
    print(f"Parsed data: model={model_type}, context={context}", file=sys.stderr)
    
    # Determine the absolute path to the model files
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, f"../assets/pickles/n_gram_{model_type}.pkl")
    
    print(f"Looking for model at: {model_path}", file=sys.stderr)
    
    # Check if model file exists
    if not os.path.exists(model_path):
        print(f"Model file not found at: {model_path}, using mock data", file=sys.stderr)
        # Provide mock predictions based on the model type
        if context and context[0] == "mov":
            if model_type == '8051':
                mock_predictions = [("a", 10), ("b", 8), ("r1", 6), ("dptr", 4), ("c", 2)]
            else:  # 8085
                mock_predictions = [("a", 10), ("b", 8), ("h", 6), ("l", 4), ("m", 2)]
        else:
            mock_predictions = [("mov", 12), ("add", 8), ("jmp", 6), ("inc", 4), ("ret", 2)]
        
        print(json.dumps({"success": True, "predictions": mock_predictions, "model": model_type}))
        sys.exit(0)
    
    # If we reach here, try to use the actual model
    try:
        # Load the appropriate model
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        # Make prediction using our generalized function
        result = predict_next_word(model, context)
        
        # Return the result as JSON
        print(json.dumps({"success": True, "predictions": result, "model": model_type}))
        
    except Exception as e:
        print(f"Error using model: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        
        # Fall back to mock data based on model type
        if context and context[0] == "mov":
            if model_type == '8051':
                mock_predictions = [("a", 10), ("b", 8), ("r1", 6), ("dptr", 4), ("c", 2)]
            else:  # 8085
                mock_predictions = [("a", 10), ("b", 8), ("h", 6), ("l", 4), ("m", 2)]
        else:
            mock_predictions = [("mov", 12), ("add", 8), ("jmp", 6), ("inc", 4), ("ret", 2)]
        
        print(json.dumps({"success": True, "predictions": mock_predictions, "model": model_type}))
        
except Exception as e:
    # Catch all other exceptions
    print(f"Unexpected error: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    print(json.dumps({"success": False, "error": str(e)}))
    sys.exit(1)