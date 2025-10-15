% MATLAB Script for Individual Algorithm Performance Scatter Plots
clear; close all; clc;

% Define algorithms and sizes
algorithms = {'DFS', 'A*', 'HYBRID'};
sizes = {'7x7', '15x15', '21x21'};
colors = [0.2 0.6 0.8; 0.8 0.4 0.2; 0.4 0.7 0.3]; % Different colors for grid sizes

% Load all data
% DFS Data
dfs_data = struct();
dfs_data.execution_time = [
    0.108; 0.780; 1.048; 1.090; 0.448; 0.456; 0.662; 0.874; 0.940; 0.525; % 7x7
    3.078; 3.006; 2.775; 2.308; 2.724; 3.402; 2.754; 3.129; 3.107; 4.081; % 15x15
    2.086; 2.058; 2.752; 3.043; 1.828; 2.669; 2.181; 2.224; 2.821; 1.792  % 21x21
];
dfs_data.accuracy = [
    median([1,1]); median([0.9667,1]); median([1,1]); median([1,1]); median([1,1]); 
    median([1,1]); median([1,1]); median([1,1]); median([1,1]); median([1,1]); % 7x7
    median([0.9917,1]); median([1,1]); median([0.9915,1]); median([0.9915,1]); median([0.9911,1]);
    median([1,1]); median([1,1]); median([0.9915,1]); median([0.9915,1]); median([0.9915,1]); % 15x15
    median([1,1]); median([1,1]); median([1,1]); median([1,1]); median([1,1]);
    median([0.9949,1]); median([0.9949,1]); median([1,1]); median([0.9776,1]); median([1,1])  % 21x21
];
dfs_data.memory_usage = [
    2.81; 9.15; 7.16; 3.31; 1.61; 9.13; 2.71; 6.39; 10.66; 7.39; % 7x7
    14.24; 12.47; 12.97; 9.20; 10.71; 9.42; 7.78; 9.15; 9.85; 7.77; % 15x15
    3.89; 13.27; 7.11; 11.62; 11.37; 7.41; 11.63; 8.65; 7.42; 14.65  % 21x21
];
dfs_data.size_groups = [ones(10,1); 2*ones(10,1); 3*ones(10,1)]; % 1=7x7, 2=15x15, 3=21x21

% A* Data
astar_data = struct();
astar_data.execution_time = [
    0.078; 0.424; 0.472; 0.485; 0.270; 0.297; 0.370; 0.341; 0.435; 0.281; % 7x7
    1.876; 1.348; 1.224; 1.074; 1.117; 1.425; 1.356; 1.340; 1.906; 1.816; % 15x15
    1.235; 1.095; 1.162; 1.179; 1.075; 1.290; 1.113; 1.192; 1.093; 0.912  % 21x21
];
astar_data.accuracy = [
    median([1,1]); median([0.9667,1]); median([1,1]); median([1,1]); median([1,1]);
    median([1,1]); median([1,1]); median([1,1]); median([1,1]); median([1,1]); % 7x7
    median([0.9917,1]); median([1,1]); median([0.9915,1]); median([0.9915,1]); median([0.9821,1]);
    median([0.9915,1]); median([1,1]); median([0.9915,1]); median([0.9915,1]); median([0.9758,1]); % 15x15
    median([0.9944,1]); median([1,1]); median([1,1]); median([1,1]); median([0.9942,1]);
    median([0.9898,1]); median([0.9949,1]); median([0.9831,1]); median([0.9779,1]); median([1,1])  % 21x21
];
astar_data.memory_usage = [
    15.79; 5.47; 5.66; 14.13; 12.12; 14.57; 10.84; 4.85; 4.81; 4.89; % 7x7
    55.59; 53.98; 56.30; 22.89; 26.95; 33.98; 21.72; 23.85; 34.54; 31.51; % 15x15
    80.12; 111.87; 78.29; 89.97; 66.70; 70.05; 66.23; 65.14; 63.55; 67.57  % 21x21
];
astar_data.size_groups = [ones(10,1); 2*ones(10,1); 3*ones(10,1)];

% Hybrid Data
hybrid_data = struct();
hybrid_data.execution_time = [
    0.227; 0.374; 0.313; 0.285; 0.373; 0.472; 0.311; 0.319; 0.413; 0.273; % 7x7
    0.936; 0.816; 0.716; 0.710; 0.774; 0.846; 0.708; 1.326; 0.638; 0.963; % 15x15
    1.301; 1.554; 1.605; 1.667; 1.330; 1.299; 1.386; 1.361; 1.411; 1.254  % 21x21
];
hybrid_data.accuracy = [
    median([1,1]); median([1,1]); median([1,1]); median([1,1]); median([1,1]);
    median([1,1]); median([1,1]); median([1,1]); median([1,1]); median([1,1]); % 7x7
    median([1,1]); median([1,1]); median([1,1]); median([1,1]); median([0.9892,1]);
    median([1,1]); median([1,1]); median([0.991,1]); median([1,1]); median([0.9878,1]); % 15x15
    median([1,1]); median([0.9797,1]); median([0.9795,1]); median([1,1]); median([1,1]);
    median([1,1]); median([1,1]); median([0.9945,1]); median([1,1]); median([1,1])  % 21x21
];
hybrid_data.memory_usage = [
    7.57; 6.78; 4.02; 3.01; 2.87; 2.25; 2.50; 0.98; 2.18; 3.17; % 7x7
    2.63; 3.27; 1.15; 3.03; 1.35; 2.92; 1.24; 1.48; 1.42; 3.51; % 15x15
    1.12; 1.64; 4.30; 9.03; 128.59; 11.28; 5.62; 5.71; 7.18; 7.67  % 21x21
];
hybrid_data.size_groups = [ones(10,1); 2*ones(10,1); 3*ones(10,1)];

% Create individual scatter plots for each algorithm and metric
figure('Position', [100, 100, 1500, 1200]);

% DFS Plots
subplot(3,3,1);
scatter(1:length(dfs_data.execution_time), dfs_data.execution_time, 50, dfs_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Execution Time (s)');
title('DFS - Execution Time');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;

subplot(3,3,2);
scatter(1:length(dfs_data.accuracy), dfs_data.accuracy, 50, dfs_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Accuracy (Median Cell/Word)');
title('DFS - Accuracy');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;
ylim([0.95, 1.01]);

subplot(3,3,3);
scatter(1:length(dfs_data.memory_usage), dfs_data.memory_usage, 50, dfs_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Memory Usage (KB)');
title('DFS - Memory Usage');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;

% A* Plots
subplot(3,3,4);
scatter(1:length(astar_data.execution_time), astar_data.execution_time, 50, astar_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Execution Time (s)');
title('A* - Execution Time');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;

subplot(3,3,5);
scatter(1:length(astar_data.accuracy), astar_data.accuracy, 50, astar_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Accuracy (Median Cell/Word)');
title('A* - Accuracy');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;
ylim([0.95, 1.01]);

subplot(3,3,6);
scatter(1:length(astar_data.memory_usage), astar_data.memory_usage, 50, astar_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Memory Usage (KB)');
title('A* - Memory Usage');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;

% Hybrid Plots
subplot(3,3,7);
scatter(1:length(hybrid_data.execution_time), hybrid_data.execution_time, 50, hybrid_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Execution Time (s)');
title('Hybrid - Execution Time');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;

subplot(3,3,8);
scatter(1:length(hybrid_data.accuracy), hybrid_data.accuracy, 50, hybrid_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Accuracy (Median Cell/Word)');
title('Hybrid - Accuracy');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;
ylim([0.95, 1.01]);

subplot(3,3,9);
scatter(1:length(hybrid_data.memory_usage), hybrid_data.memory_usage, 50, hybrid_data.size_groups, 'filled');
xlabel('Trial');
ylabel('Memory Usage (KB)');
title('Hybrid - Memory Usage');
colorbar('Ticks', [1,2,3], 'TickLabels', sizes);
grid on;

sgtitle('Individual Algorithm Performance Metrics (All Grid Sizes)', 'FontSize', 16, 'FontWeight', 'bold');

% Create separate figures for each algorithm with enhanced visualization
for alg_idx = 1:length(algorithms)
    figure('Position', [100, 100, 1400, 400]);
    
    switch alg_idx
        case 1
            data = dfs_data;
            alg_name = 'DFS';
        case 2
            data = astar_data;
            alg_name = 'A*';
        case 3
            data = hybrid_data;
            alg_name = 'Hybrid';
    end
    
    % Execution Time
    subplot(1,3,1);
    hold on;
    for size_idx = 1:3
        mask = data.size_groups == size_idx;
        scatter(find(mask), data.execution_time(mask), 60, colors(size_idx,:), 'filled', 'MarkerEdgeColor', 'k');
    end
    xlabel('Trial Index');
    ylabel('Execution Time (s)');
    title([alg_name ' - Execution Time']);
    legend(sizes, 'Location', 'best');
    grid on;
    
    % Accuracy
    subplot(1,3,2);
    hold on;
    for size_idx = 1:3
        mask = data.size_groups == size_idx;
        scatter(find(mask), data.accuracy(mask), 60, colors(size_idx,:), 'filled', 'MarkerEdgeColor', 'k');
    end
    xlabel('Trial Index');
    ylabel('Accuracy (Median Cell/Word)');
    title([alg_name ' - Accuracy']);
    legend(sizes, 'Location', 'best');
    grid on;
    ylim([0.95, 1.01]);
    
    % Memory Usage
    subplot(1,3,3);
    hold on;
    for size_idx = 1:3
        mask = data.size_groups == size_idx;
        scatter(find(mask), data.memory_usage(mask), 60, colors(size_idx,:), 'filled', 'MarkerEdgeColor', 'k');
    end
    xlabel('Trial Index');
    ylabel('Memory Usage (KB)');
    title([alg_name ' - Memory Usage']);
    legend(sizes, 'Location', 'best');
    grid on;
    
    sgtitle([alg_name ' Algorithm Performance Across All Grid Sizes'], 'FontSize', 14, 'FontWeight', 'bold');
end

% Display summary statistics
fprintf('\n=== PERFORMANCE STATISTICS (All Grid Sizes Combined) ===\n');
fprintf('Algorithm\tTime Mean (s)\tTime Std (s)\tAcc Mean\tAcc Std\tMem Mean (KB)\tMem Std (KB)\n');
fprintf('---------\t-------------\t------------\t--------\t-------\t-------------\t------------\n');

data_sets = {dfs_data, astar_data, hybrid_data};
for i = 1:length(algorithms)
    data = data_sets{i};
    time_mean = mean(data.execution_time);
    time_std = std(data.execution_time);
    acc_mean = mean(data.accuracy);
    acc_std = std(data.accuracy);
    mem_mean = mean(data.memory_usage);
    mem_std = std(data.memory_usage);
    
    fprintf('%-10s\t%-13.3f\t%-12.3f\t%-8.4f\t%-7.4f\t%-13.2f\t%-12.2f\n', ...
        algorithms{i}, time_mean, time_std, acc_mean, acc_std, mem_mean, mem_std);
end

% Save figures
saveas(1, 'all_algorithms_performance.png');
for i = 1:length(algorithms)
    saveas(i+1, [algorithms{i} '_performance.png']);
end

fprintf('\nPlots saved as:\n');
fprintf('- all_algorithms_performance.png (3x3 grid)\n');
for i = 1:length(algorithms)
    fprintf('- %s_performance.png (individual algorithm)\n', algorithms{i});
end