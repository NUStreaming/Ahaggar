#!/bin/env python

import os
import sys
import subprocess

# path_to_network_run = "results_v3.2/5GLumous"
# path_to_network_run = "results_v3.2/4GLumous"
# path_to_network_run = "results_v3.2/4GNYU"
# path_to_network_run = "results_v3.2/4GBelgium"
# list_of_abrs = ["abrAhaggar", "abrThroughput", "abrDynamic", "abrBola", "abrFastMPC", "abrPensieve"]

# path_to_network_run = "results_v3.4a/5GLumous"
# path_to_network_run = "results_v3.4a/4GLumous"
# path_to_network_run = "results_v3.4a/4GNYU"
# path_to_network_run = "results_v3.4a/4GBelgium"
# list_of_abrs = ["abrAhaggarUHDTV6", "abrAhaggarHDTV6", "abrAhaggarUHDTV3_abrDynamic3", "abrAhaggarHDTV3_abrDynamic3", "abrDynamic6"]

# path_to_results_folder = "results_v4.1/"
# list_of_abrs = ["abrAhaggar", "abrThroughput", "abrDynamic", "abrBola", "abrFastMPC", "abrPensieve"]

path_to_results_folder = "results_v4.1_split_by_device/"
list_of_abrs = ["abrAhaggar_hdtv", "abrAhaggar_uhdtv", "abrAhaggar_phone"]

# path_to_results_folder = "results_v3.4b/"
# list_of_abrs = ["abrAhaggarUHDTV6", "abrAhaggarHDTV6", "abrAhaggarUHDTV3_abrDynamic3", "abrAhaggarHDTV3_abrDynamic3", "abrDynamic6"]

# path_to_results_folder = "results_v3.4a_split_by_abr/"
# list_of_abrs = ["abrAhaggarUHDTV3_abrDynamic3_AHA", "abrAhaggarUHDTV3_abrDynamic3_DYN", "abrAhaggarHDTV3_abrDynamic3_AHA", "abrAhaggarHDTV3_abrDynamic3_DYN"]

for network_profile in ["5GLumous", "4GLumous", "4GNYU", "4GBelgium"]:
    path_to_network_run = path_to_results_folder + network_profile

    csv_lines = ""
    comments = ""
    for abr in list_of_abrs:
        path_to_run_results_folders = path_to_network_run + "/" + abr

        header_csv_row = ""
        for root, dirs, files in os.walk(path_to_run_results_folders):
            for name in sorted(dirs):
                if "multiple_clients" in name:
                    print("Processing: " + name)
                    folder = os.path.join(root, name)
                    generate_summary_output = subprocess.check_output(("python generate_summary.py " + folder), shell=True).decode(sys.stdout.encoding).split("\n")

                    if len(header_csv_row) == 0:
                        header_csv_row = abr + ", " + generate_summary_output[-3]
                        csv_lines += (header_csv_row + "\n")

                    result_csv_row = folder + ", " + generate_summary_output[-2]
                    csv_lines += (result_csv_row + "\n")

                    comments += (generate_summary_output[-5] + "  (verify folder: " + folder + ")\n")

        # csv_lines += "\n\n\n"   # tmp - added to pad additional rows for runs not yet ran
        csv_lines += "\n"   # empty line to insert average computation in gSheets
        comments += "\n"

    print("\nDone!")
    print(comments)

    results_file = path_to_network_run + "/network_run_results.csv"
    with open(results_file, "w") as results_f:
        results_f.write(csv_lines)
        print("\nSaved results_file: " + results_file)