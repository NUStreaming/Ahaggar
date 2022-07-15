import os


copy_from_folder = "new_profiles/5s/SharedNetworkTrace"
generate_to_folder = "new_profiles/5s/SharedNetworkTracex2"


for root, dirs, files in os.walk(copy_from_folder):
    for name in files:  # for each client in this run
        filepath = os.path.join(root, name)
        new_filepath = filepath.replace(copy_from_folder, generate_to_folder)

        new_root = root.replace(copy_from_folder, generate_to_folder)
        if not os.path.isdir(new_root):
            os.mkdir(new_root)
        
        with open(filepath, 'r') as f:
            with open(new_filepath, 'w') as new_f:
                for line in f:
                    if "rate" in line:
                        prefix = "rate\t"
                        suffix = "mbit\n"
                        bandwidth_value = line.split(prefix)[-1].split(suffix)[0]
                        new_bandwidth_value = str(float(bandwidth_value) * 1.5) # increase bandwidth values by 1.5x
                        new_line = prefix + new_bandwidth_value + suffix

                        print("---------------------------")
                        print(line)
                        print('bandwidth_value ' + bandwidth_value)
                        print('new_bandwidth_value ' + new_bandwidth_value)
                        print(new_line)
                    else:
                        new_line = line
                    new_f.write(new_line)