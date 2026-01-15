import pandas as pd
import os
import fastavro

def convert_file(input_paths, output_path, target_format):
    """
    Converts multiple files from input_paths, merges them, and saves to output_path in target_format.
    Supports: csv, xlsx, json, parquet, avro.
    """
    dfs = []

    # READ logic
    for input_path in input_paths:
        ext = os.path.splitext(input_path)[1].lower()
        try:
            if ext == '.csv':
                dfs.append(pd.read_csv(input_path))
            elif ext == '.xlsx':
                dfs.append(pd.read_excel(input_path))
            elif ext == '.json':
                dfs.append(pd.read_json(input_path))
            elif ext == '.parquet':
                dfs.append(pd.read_parquet(input_path))
            elif ext == '.avro':
                with open(input_path, 'rb') as f:
                    reader = fastavro.reader(f)
                    records = [r for r in reader]
                    dfs.append(pd.DataFrame(records))
            else:
                raise ValueError(f"Unsupported input format: {ext}")
        except Exception as e:
            raise ValueError(f"Error reading file {input_path}: {e}")

    if not dfs:
        raise ValueError("No valid data found to convert.")

    # MERGE logic
    try:
        final_df = pd.concat(dfs, ignore_index=True)
    except Exception as e:
        raise ValueError(f"Error merging files: {e}")

    # WRITE logic
    try:
        if target_format == 'csv':
            final_df.to_csv(output_path, index=False)
        elif target_format == 'xlsx':
            final_df.to_excel(output_path, index=False)
        elif target_format == 'json':
            final_df.to_json(output_path, orient='records', indent=2)
        elif target_format == 'parquet':
            final_df.to_parquet(output_path)
        elif target_format == 'txt':
            # Simple text dump
            with open(output_path, 'w') as f:
                f.write(final_df.to_string())
        else:
            raise ValueError(f"Unsupported target format: {target_format}")
    except Exception as e:
        raise ValueError(f"Error writing file: {e}")
