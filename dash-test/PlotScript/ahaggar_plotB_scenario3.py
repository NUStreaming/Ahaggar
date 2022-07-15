import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import scipy.stats


RESULTS_FOLDERS = [
    "../results//results_v3.3_split_by_device/4GLumous",
    "../results//results_v3.3_split_by_device/4GBelgium",
    "../results//results_v3.3_split_by_device/4GNYU",
    "../results//results_v3.3_split_by_device/5GLumous"
]

RESULTS_FILE_CSV = "network_run_results.csv"

SCHEMES = ['Ahaggar_hdtv', 'Ahaggar_uhdtv', 'Ahaggar_phone']

PLOTS_FOLDER = "plots_scenario3_v2"
if not os.path.exists(PLOTS_FOLDER):
    os.mkdir(PLOTS_FOLDER)

def mean_confidence_interval(data, confidence=0.95):
    a = 1.0 * np.array(data)
    n = len(a)
    m, se = np.mean(a), scipy.stats.sem(a)
    h = se * scipy.stats.t.ppf((1 + confidence) / 2., n-1)
    return m, m-h, m+h


def get_dataarr_from_csv_file(results_csv_filepath, scheme, data_col_idx):
    dataarr = []
    with open(results_csv_filepath, 'r') as f:
        lines = f.readlines()
        for line in lines:
            line = line.strip()
            csv_values = line.split(", ")
            if scheme in csv_values[0]:
                try:
                    val = float(csv_values[data_col_idx])
                    dataarr.append(val)
                except ValueError:
                    # skip non-float values, eg. header
                    pass
    return dataarr


def generate_graphs():
    ##
    ## Prepare data
    ##
    summay_all_plot = {}
    network_profiles = []
    stall_percent_col_idx = 17
    vmaf_col_idx = 45
    qoe_col_idx = 61

    # max_stall_percent_plot = 0

    for scheme in SCHEMES:
        summay_all_plot[scheme] = {}
        summay_all_plot[scheme]["all_avg_by_profiles"] = {
            'avg_stall_percent': [],
            'avg_vmaf': [],
            'avg_qoe': []
        }

        for network_profile_folder in RESULTS_FOLDERS:
            results_csv_filepath = network_profile_folder + "/" + RESULTS_FILE_CSV
            network_profile = network_profile_folder.split("/")[-1].split(".")[0]
            if network_profile not in network_profiles:
                network_profiles.append(network_profile)
            summay_all_plot[scheme][network_profile] = {}

            stall_percent_arr = get_dataarr_from_csv_file(results_csv_filepath, scheme, stall_percent_col_idx)
            vmaf_arr = get_dataarr_from_csv_file(results_csv_filepath, scheme, vmaf_col_idx)
            qoe_arr = get_dataarr_from_csv_file(results_csv_filepath, scheme, qoe_col_idx)

            summay_all_plot[scheme][network_profile]['avg_stall_percent'] = np.mean(stall_percent_arr)
            summay_all_plot[scheme][network_profile]['all_stall_percent'] = stall_percent_arr
            summay_all_plot[scheme][network_profile]['avg_vmaf'] = np.mean(vmaf_arr)
            summay_all_plot[scheme][network_profile]['all_vmaf'] = vmaf_arr
            summay_all_plot[scheme][network_profile]['avg_qoe'] = np.mean(qoe_arr)
            summay_all_plot[scheme][network_profile]['all_qoe'] = qoe_arr

            # For bar charts
            summay_all_plot[scheme]["all_avg_by_profiles"]["avg_stall_percent"].append(summay_all_plot[scheme][network_profile]['avg_stall_percent'])
            summay_all_plot[scheme]["all_avg_by_profiles"]["avg_vmaf"].append(summay_all_plot[scheme][network_profile]['avg_vmaf'])
            summay_all_plot[scheme]["all_avg_by_profiles"]["avg_qoe"].append(summay_all_plot[scheme][network_profile]['avg_qoe'])

            # max_stall_percent_plot1 = max(max_stall_percent_plot1, np.max(stall_percent_arr))

    ##
    ## Prepare data for average across all schemes
    ##
    summay_all_plot["avg_all_schemes"] = { 'all_avg_by_profiles': {} }
    
    for (avg_key, all_data_key) in [('avg_stall_percent', 'all_stall_percent'), ('avg_vmaf', 'all_vmaf'), ('avg_qoe', 'all_qoe')]:
        summay_all_plot["avg_all_schemes"]["all_avg_by_profiles"][avg_key] = []
        
        for network_profile in network_profiles:
            if network_profile not in summay_all_plot["avg_all_schemes"]:
                summay_all_plot["avg_all_schemes"][network_profile] = {}
            if all_data_key not in summay_all_plot["avg_all_schemes"][network_profile]:
                summay_all_plot["avg_all_schemes"][network_profile][all_data_key] = []
            
            for scheme in SCHEMES:
                summay_all_plot["avg_all_schemes"][network_profile][all_data_key] += summay_all_plot[scheme][network_profile][all_data_key]
            
            summay_all_plot["avg_all_schemes"][network_profile][avg_key] = np.mean(summay_all_plot["avg_all_schemes"][network_profile][all_data_key])
            summay_all_plot["avg_all_schemes"]["all_avg_by_profiles"][avg_key].append(summay_all_plot["avg_all_schemes"][network_profile][avg_key]) # one value appended for each network_profile


    print("summay_all_plot:")
    print(summay_all_plot)
    print("network_profiles:")
    print(network_profiles)
    # print("max_stall_percent_plot: " + str(max_stall_percent_plot))
    
    ##
    ## Generate plot for each metric
    ##
    for (avg_key, all_data_key, metric_label) in [('avg_stall_percent', 'all_stall_percent', 'Time Spent on Stall (%)'), ('avg_vmaf', 'all_vmaf', 'VMAF'), ('avg_qoe', 'all_qoe', 'QoE$^{itu}$')]:
        # fig, (ax) = plt.subplots(1, 1, figsize=(8,4))
        fig, (ax) = plt.subplots(1, 1, figsize=(8,4))

        if 'stall_percent' in avg_key:
            ax.set_ylim(0, 13)
            pass
        elif 'vmaf' in avg_key:
            ax.set_ylim(70, 109)
        elif 'qoe' in avg_key:
            ax.set_ylim(1, 5.9)

        xpositions = np.arange(len(network_profiles))
        width = 0.2

        scheme_labels = []
        for scheme in SCHEMES:
            if scheme == "Ahaggar_hdtv":
                scheme_labels.append("UHDTV")   # Note that hdtv and uhdtv got swapped in experiment logs/results
            elif scheme == "Ahaggar_uhdtv":
                scheme_labels.append("HDTV")
            elif scheme == "Ahaggar_phone":
                scheme_labels.append("Phone")

        network_labels = []
        for profile in network_profiles:
            if profile == "4GNYU":
                new_label = "NYU LTE"
            else:
                new_label = profile[2:] + " " + profile[0:2]
            network_labels.append(new_label)

        ax.bar(xpositions - width*1.5, summay_all_plot[SCHEMES[0]]["all_avg_by_profiles"][avg_key], width, label=scheme_labels[0])
        ax.bar(xpositions - width*0.5, summay_all_plot[SCHEMES[1]]["all_avg_by_profiles"][avg_key], width, label=scheme_labels[1])
        ax.bar(xpositions + width*0.5, summay_all_plot[SCHEMES[2]]["all_avg_by_profiles"][avg_key], width, label=scheme_labels[2])
        ax.bar(xpositions + width*1.5, summay_all_plot['avg_all_schemes']["all_avg_by_profiles"][avg_key], width, label="Average")

        for profile_idx in range(len(network_profiles)):
            profile = network_profiles[profile_idx]
            
            m_y, left_m_y, right_m_y = mean_confidence_interval(summay_all_plot[SCHEMES[0]][profile][all_data_key])
            ax.errorbar(xpositions[profile_idx] - width*1.5, summay_all_plot[SCHEMES[0]][profile][avg_key], yerr=(m_y-left_m_y), capsize=4, color='grey')

            m_y, left_m_y, right_m_y = mean_confidence_interval(summay_all_plot[SCHEMES[1]][profile][all_data_key])
            ax.errorbar(xpositions[profile_idx] - width*0.5, summay_all_plot[SCHEMES[1]][profile][avg_key], yerr=(m_y-left_m_y), capsize=4, color='grey')

            m_y, left_m_y, right_m_y = mean_confidence_interval(summay_all_plot[SCHEMES[2]][profile][all_data_key])
            ax.errorbar(xpositions[profile_idx] + width*0.5, summay_all_plot[SCHEMES[2]][profile][avg_key], yerr=(m_y-left_m_y), capsize=4, color='grey')

            m_y, left_m_y, right_m_y = mean_confidence_interval(summay_all_plot['avg_all_schemes'][profile][all_data_key])
            ax.errorbar(xpositions[profile_idx] + width*1.5, summay_all_plot['avg_all_schemes'][profile][avg_key], yerr=(m_y-left_m_y), capsize=4, color='grey')
        
        ax.legend(loc='upper left', ncol=2, fontsize=16)

        ax.set_xticks(xpositions)
        # ax.set_xticklabels(network_profiles, fontsize=18)
        ax.set_xticklabels(network_labels, fontsize=18)
        ax.set_ylabel(metric_label, fontsize=20)
        # ax.tick_params(axis='both', which='major', labelsize=20)
        ax.tick_params(axis='y', which='major', labelsize=20)
        
        ax.yaxis.get_major_locator().set_params(integer=True)

        for format in ["pdf", "png", "eps"]:
            plots_format_dir = PLOTS_FOLDER + "/" + format
            if not os.path.exists(plots_format_dir):
                os.mkdir(plots_format_dir)
            save_filepath = plots_format_dir + "/scenario3_" + avg_key + "." + format
            plt.savefig(save_filepath)
            print("> Saved: " + save_filepath)

    return

if __name__ == '__main__':
    # for folder in RESULTS_FOLDERS:
    #     results_csv_filepath = folder + "/" + RESULTS_FILE_CSV
    #     network_profile = folder.split("/")[-1].split(".")[0]
    #     generate_graph(results_csv_filepath, network_profile)
    generate_graphs()
