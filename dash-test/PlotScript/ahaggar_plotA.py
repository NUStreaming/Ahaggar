import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import scipy.stats


# RESULTS_FOLDERS = [
#     "../results/results_v3.2/5GLumous",
#     "../results/results_v3.2/4GLumous",
#     "../results/results_v3.2/4GNYU",
#     "../results/results_v3.2/4GBelgium",
#     "../results/results_v3.1/5GLumous",
#     "../results/results_v3.1/4GLumous",
#     "../results/results_v3.1/4GNYU",
#     "../results/results_v3.1/4GBelgium"
# ]
RESULTS_FOLDERS = [
    "../results/results_v4.1/5GLumous",
    "../results/results_v4.1/4GLumous",
    "../results/results_v4.1/4GNYU",
    "../results/results_v4.1/4GBelgium"
]
RESULTS_FILE_CSV = "network_run_results.csv"
SCHEMES = ['Ahaggar', 'Throughput', 'Dynamic', 'Bola', 'FastMPC', 'Pensieve']


PLOTS_SAVE_FOLDER = "plotA_results_v4.1"

if not os.path.exists(PLOTS_SAVE_FOLDER):
    os.mkdir(PLOTS_SAVE_FOLDER)
else: 
    print("`PLOTS_SAVE_FOLDER` exists, contents will  be overwritten: " + PLOTS_SAVE_FOLDER)
    if input('Do you wish to continue? [`y` to continue] ') != 'y':
        exit()


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


def generate_graph(results_csv_filepath, network_profile, save_filename):
    ##
    ## Prepare data
    ##
    summay_all_plot1 = {}
    summay_all_plot2 = {}
    stall_percent_col_idx = 17
    qoe_col_idx = 61

    max_stall_percent_plot1 = 0
    max_stall_percent_plot2 = 0

    for scheme in SCHEMES:
        summay_all_plot1[scheme] = {}
        summay_all_plot2[scheme] = {}

        # Process data for plot1
        stall_percent_arr = get_dataarr_from_csv_file(results_csv_filepath, scheme, stall_percent_col_idx)
        qoe_arr = get_dataarr_from_csv_file(results_csv_filepath, scheme, qoe_col_idx)
        # print("\nProcessing: " + scheme)
        # print("[Plot1] stall_percent_arr:")
        # print(stall_percent_arr)
        # print("[Plot1] qoe_arr:")
        # print(qoe_arr)

        summay_all_plot1[scheme]['avg_stall_percent'] = np.mean(stall_percent_arr)
        summay_all_plot1[scheme]['all_stall_percent'] = stall_percent_arr
        summay_all_plot1[scheme]['avg_qoe'] = np.mean(qoe_arr)
        summay_all_plot1[scheme]['all_qoe'] = qoe_arr

        max_stall_percent_plot1 = max(max_stall_percent_plot1, np.max(stall_percent_arr))

        # # Process data for plot2
        # results_csv_filepath = RESULTS_FOLDER_PLOT2 + '/' + RESULTS_FILE_CSV
        # stall_percent_arr = get_dataarr_from_csv_file(results_csv_filepath, scheme, stall_percent_col_idx)
        # qoe_arr = get_dataarr_from_csv_file(results_csv_filepath, scheme, qoe_col_idx)
        # # print("[Plot2] stall_percent_arr:")
        # # print(stall_percent_arr)
        # # print("[Plot2] qoe_arr:")
        # # print(qoe_arr)

        # summay_all_plot2[scheme]['avg_stall_percent'] = np.mean(stall_percent_arr)
        # summay_all_plot2[scheme]['all_stall_percent'] = stall_percent_arr
        # summay_all_plot2[scheme]['avg_qoe'] = np.mean(qoe_arr)
        # summay_all_plot2[scheme]['all_qoe'] = qoe_arr

        # max_stall_percent_plot2 = max(max_stall_percent_plot2, np.max(stall_percent_arr))

    # print("summay_all_plot1:")
    # print(summay_all_plot1)
    # print("max_stall_percent_plot1: " + str(max_stall_percent_plot1))
    # print("summay_all_plot2:")
    # print(summay_all_plot2)
    # print("max_stall_percent_plot2: " + str(max_stall_percent_plot2))
    

    ##
    ## Generate plots
    ##
    # fig, (ax, ax2, ax3) = plt.subplots(1, 3, figsize=(20,4))
    # fig, (ax, ax2) = plt.subplots(1, 2, figsize=(16,4))
    # fig, (ax) = plt.subplots(1, 1, figsize=(8,4))
    fig, (ax) = plt.subplots(1, 1, figsize=(8,6))

    MARKERS = ['o', '*', 'd', '>', '<', '^', 'v']
    
    # Defaults
    xlim_start_plot1 = max_stall_percent_plot1
    ylim_start_plot1 = 1

    # for results v3.1, v3.2
    # if network_profile == "4GLumous":
    #     if "_6c" in save_filename:
    #         xlim_start_plot1 = 12
    #     elif "_1c" in save_filename:
    #         xlim_start_plot1 = 20
    # elif network_profile == "4GNYU":
    #     xlim_start_plot1 = 20
    #     ylim_start_plot1 = 1
    # elif network_profile == "4GBelgium":
    #     ylim_start_plot1 = 1

    # for results v4.1
    if network_profile == "4GBelgium":
        xlim_start_plot1 = 27
    elif network_profile == "4GLumous":
        xlim_start_plot1 = 27
    elif network_profile == "4GNYU":
        xlim_start_plot1 = 27


    # ax = fig.add_subplot(111)
    ax.set_xlim(xlim_start_plot1, 0)
    ax.set_ylim(ylim_start_plot1, 5)
    # ax.hlines(0.8, 0, 5, linestyle='--', color='maroon')
    # ax.vlines(5, 0.8, 1, linestyle='--', color='maroon')
    ax.set_axisbelow(True)
    ax.xaxis.grid(linestyle='dashed')
    ax.yaxis.grid(linestyle='dashed')
    # plt.xticks(np.arange(12, 0.0, -4.0))
    # ax.xaxis.set_major_formatter(mtick.PercentFormatter())

    for idx in range(len(SCHEMES)):
        scheme = SCHEMES[idx]
        if scheme == "Throughput":
            label = "TH"
        elif scheme == "Bola":
            label = "BOLA"
        elif scheme == "FastMPC":
            label = "MPCDASH"
        else:
            label = scheme

        # print(np.mean(summay_all_plot1[scheme]['reward']))
        # print("mean for scheme %s are %f, %f" % (scheme, np.mean(summay_all_plot1[scheme]['all_stall_percent']), np.mean(summay_all_plot1[scheme]['all_qoe'])))
        m_x, left_m_x, right_m_x = mean_confidence_interval(summay_all_plot1[scheme]['all_stall_percent'])
        m_y, left_m_y, right_m_y = mean_confidence_interval(summay_all_plot1[scheme]['all_qoe'])
        # print("confidence interval scheme %s are %f, %f" % (scheme, m_x-left_m_x, m_y-left_m_y))
        # print("variance scheme %s are %f, %f" % (scheme, np.std(summay_all_plot1[scheme]['all_stall_percent']), np.std(summay_all_plot1[scheme]['all_qoe'])))
        # ax.errorbar(summay_all_plot1[scheme]['avg_stall_percent'], summay_all_plot1[scheme]['avg_qoe']/160.0, xerr=m_x-left_m_x, yerr=(m_y-left_m_y)/160.0, capsize=4)
        # ax.scatter(summay_all_plot1[scheme]['avg_stall_percent'], summay_all_plot1[scheme]['avg_qoe']/160.0)
        ax.errorbar(summay_all_plot1[scheme]['avg_stall_percent'], summay_all_plot1[scheme]['avg_qoe'], xerr=m_x-left_m_x, yerr=(m_y-left_m_y), capsize=4)
        ax.scatter(summay_all_plot1[scheme]['avg_stall_percent'], summay_all_plot1[scheme]['avg_qoe'], label=label, marker=MARKERS[idx], s=400)
        # if scheme == "interfaceMPC":
        #     ax.annotate(scheme + ' (no overhead)', (summay_all_plot1[scheme]['avg_stall_percent']-0.1, summay_all_plot1[scheme]['avg_qoe']+0.01), fontsize=19)
        # elif scheme == "interface":
        #     ax.annotate(scheme, (summay_all_plot1[scheme]['avg_stall_percent']+1.3, summay_all_plot1[scheme]['avg_qoe']/160.0-0.6/160.0), fontsize=19)
        # elif scheme == "truthMPC":
        #     ax.annotate(scheme, (summay_all_plot1[scheme]['avg_stall_percent']-0.1, summay_all_plot1[scheme]['avg_qoe']/160.0+0.1/160.0), fontsize=19)
        # elif scheme == "BB":
        #     ax.annotate("BBA", (summay_all_plot1[scheme]['avg_stall_percent']+1.3, summay_all_plot1[scheme]['avg_qoe']/160.0-0.05), fontsize=19)
        # elif scheme == 'RL':
        #     ax.annotate("Pensieve", (summay_all_plot1[scheme]['avg_stall_percent']-0.1, summay_all_plot1[scheme]['avg_qoe']/160.0+2/160.0), fontsize=19)
        # elif scheme == 'BOLA':
        #     ax.annotate(scheme, (summay_all_plot1[scheme]['avg_stall_percent']-0.1, summay_all_plot1[scheme]['avg_qoe']/160.0-0.05), fontsize=19)
        # elif scheme == 'rollbackMPC4s':
        #     ax.annotate("4s (w/ rollback)", (summay_all_plot1[scheme]['avg_stall_percent']-0.1, summay_all_plot1[scheme]['avg_qoe']/160.0+0.1/160.0), fontsize=19)
        # elif scheme == 'fastMPC':
        #     ax.annotate(scheme, (summay_all_plot1[scheme]['avg_stall_percent']-0.1, summay_all_plot1[scheme]['avg_qoe']/160.0-0.05), fontsize=19)
        # elif scheme == 'FESTIVE':
        #     ax.annotate(scheme, (summay_all_plot1[scheme]['avg_stall_percent']+2.5, summay_all_plot1[scheme]['avg_qoe']/160.0+0.01), fontsize=19)
        # elif scheme == 'robustMPC':
        #     ax.annotate(scheme, (summay_all_plot1[scheme]['avg_stall_percent']+1.6, summay_all_plot1[scheme]['avg_qoe']/160.0+0.04), fontsize=19)
        # else:
        # ax.annotate(scheme, (summay_all_plot1[scheme]['avg_stall_percent']-0.1, summay_all_plot1[scheme]['avg_qoe']-0.1), fontsize=19)
    
    # ax.legend(loc='upper center', bbox_to_anchor=(0.5, 1.28), ncol=3, fontsize=16)
    # ax.legend(loc='best', ncol=2, fontsize=16)
    if "5GLumous_1c" in save_filename:
        ax.legend(loc='lower right', ncol=2, fontsize=18)
    else:
        ax.legend(loc='upper left', ncol=2, fontsize=18)

    ax.xaxis.get_major_locator().set_params(integer=True)
    ax.yaxis.get_major_locator().set_params(integer=True)

    # bb = t.get_bbox_patch()
    # bb.set_boxstyle("rarrow", pad=0.6)
    ax.set_xlabel('Time Spent on Stall (%)', fontsize=20)
    ax.set_ylabel('QoE$^{itu}$', fontsize=20)
    ax.tick_params(axis='both', which='major', labelsize=20)

    ax.annotate("Better", fontsize=20,
        horizontalalignment="center",
        # xy=(11, 0.55), xycoords='data',
        # xytext=(9, 0.63), textcoords='data',
        xy=(xlim_start_plot1*0.95, ylim_start_plot1*1.03), xycoords='data',
        xytext=(xlim_start_plot1*0.8, ylim_start_plot1*1.5), textcoords='data',
        arrowprops=dict(arrowstyle="<-, head_width=0.3",
                        connectionstyle="arc3", lw=3)
            )


    # # fig = plt.figure(figsize=(8,6))
    # # ax2 = fig.add_subplot(111)
    # ax2.set_xlim(xlim_start_plot2, 0)
    # ax2.set_ylim(ylim_start_plot2, 5)
    # # ax2.hlines(0.8, 0, 5, linestyle='--', color='maroon')
    # # ax2.vlines(5, 0.8, 1, linestyle='--', color='maroon')
    # ax2.set_axisbelow(True)
    # ax2.xaxis.grid(linestyle='dashed')
    # ax2.yaxis.grid(linestyle='dashed')
    # # plt.xticks(np.arange(12, 0.0, -4.0))
    # for scheme in SCHEMES:
    #     m_x, left_m_x, right_m_x = mean_confidence_interval(summay_all_plot2[scheme]['all_stall_percent'])
    #     m_y, left_m_y, right_m_y = mean_confidence_interval(summay_all_plot2[scheme]['all_qoe'])
    #     # print("mean for scheme %s are %f, %f" % (scheme, np.mean(summay_all_plot2[scheme]['all_stall_percent']), np.mean(summay_all_plot2[scheme]['all_qoe'])))
    #     ax2.errorbar(summay_all_plot2[scheme]['avg_stall_percent'], summay_all_plot2[scheme]['avg_qoe'], xerr=m_x-left_m_x, yerr=(m_y-left_m_y), capsize=4)
    #     ax2.scatter(summay_all_plot2[scheme]['avg_stall_percent'], summay_all_plot2[scheme]['avg_qoe'], label=scheme)
    #     # if scheme == 'fastMPC':
    #     #     ax2.annotate(scheme, (summay_all_plot2[scheme]['avg_stall_percent']+2.5, summay_all_plot2[scheme]['avg_qoe']/20.0-0.05), fontsize=19)
    #     # elif scheme == 'robustMPC':
    #     #     ax2.annotate(scheme, (summay_all_plot2[scheme]['avg_stall_percent']+1.55, summay_all_plot2[scheme]['avg_qoe']/20.0-0.053), fontsize=19)
    #     # elif scheme == 'RL':
    #     #     # ax2.annotate('Pensieve', (summay_all_plot2[scheme]['avg_stall_percent']+6, summay_all_plot2[scheme]['avg_qoe']/20.0-0.03), fontsize=15)
    #     #     pass
    #     # elif scheme == 'BB':
    #     #     ax2.annotate('BBA', (summay_all_plot2[scheme]['avg_stall_percent']-0.15, summay_all_plot2[scheme]['avg_qoe']/20.0-0.05), fontsize=19)
    #     # elif scheme == 'FESTIVE':
    #     #     ax2.annotate(scheme, (summay_all_plot2[scheme]['avg_stall_percent']+3.55, summay_all_plot2[scheme]['avg_qoe']/20.0-0.02), fontsize=19)
    #     # else:
    #     # ax2.annotate(scheme, (summay_all_plot2[scheme]['avg_stall_percent']-0.1, summay_all_plot2[scheme]['avg_qoe']-0.1), fontsize=19)

    # ax2.xaxis.get_major_locator().set_params(integer=True)

    # ax2.set_xlabel('[' + NETWORK_PROFILE + '-1c] Time Spent on Stall (%)', fontsize=20)
    # ax2.set_ylabel('QoE ITU', fontsize=20)
    # ax2.tick_params(axis='both', which='major', labelsize=20)

    # ax2.annotate("Better", fontsize=20,
    #     horizontalalignment="center",
    #     xy=(xlim_start_plot2*0.95, ylim_start_plot2*1.03), xycoords='data',
    #     xytext=(xlim_start_plot2*0.8, ylim_start_plot2*1.23), textcoords='data',
    #     arrowprops=dict(arrowstyle="<-, head_width=0.3",
    #                     connectionstyle="arc3", lw=3)
    #     )
    # # ax2.annotate("Pensieve", fontsize=19,
    # #     horizontalalignment="center",
    # #     xy=(summay_all_plot2['RL']['avg_stall_percent'], summay_all_plot2['RL']['avg_qoe']/20.0), xycoords='data',
    # #     xytext=(10, 0.9), textcoords='data',
    # #     arrowprops=dict(arrowstyle="<-, head_width=0.1",
    # #         connectionstyle="arc3, rad=0.3", lw=1, ls='--', color='saddlebrown'
    # #     )
    # # )


    fig.tight_layout()
    # plt.show()

    for format in ["pdf", "png", "eps"]:
        plots_format_dir = PLOTS_SAVE_FOLDER + "/" + format
        if not os.path.exists(plots_format_dir):
            os.mkdir(plots_format_dir)
        save_filepath = plots_format_dir + "/" + save_filename + "." + format
        plt.savefig(save_filepath)
        print("> Saved: " + save_filepath)

    return

if __name__ == '__main__':
    for folder in RESULTS_FOLDERS:
        results_csv_filepath = folder + "/" + RESULTS_FILE_CSV
        network_profile = folder.split("/")[-1].split(".")[0]
        if "results_v3.2" in folder:
            save_filename = network_profile + "_6c"
        elif "results_v3.1" in folder:
            save_filename = network_profile + "_1c"
        else:
            save_filename = network_profile
        generate_graph(results_csv_filepath, network_profile, save_filename)
