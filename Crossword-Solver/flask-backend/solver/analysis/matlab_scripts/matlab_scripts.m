% analysis/matlab_scripts/analyze_crossword_performance.m
function results = analyze_crossword_performance(algorithm_data)
    % Analyze crossword algorithm performance
    
    % Extract data from structure
    algorithms = fieldnames(algorithm_data);
    
    % Initialize results structure
    results = struct();
    
    % Process each algorithm's data
    for i = 1:length(algorithms)
        alg = algorithms{i};
        data = algorithm_data.(alg);
        
        % Calculate performance metrics
        results.(alg).avg_time = mean(data.execution_times);
        results.(alg).std_time = std(data.execution_times);
        results.(alg).avg_memory = mean(data.memory_usage);
        
        % Generate visualizations
        fig = figure('Visible', 'off');
        
        % Execution time plot
        subplot(2, 1, 1);
        plot(data.execution_times);
        title([alg ' - Execution Times']);
        xlabel('Run');
        ylabel('Time (ms)');
        
        % Memory usage plot
        subplot(2, 1, 2);
        plot(data.memory_usage);
        title([alg ' - Memory Usage']);
        xlabel('Run');
        ylabel('Memory (MB)');
        
        % Save figure
        filename = [alg '_performance_' datestr(now, 'yyyymmdd_HHMMSS') '.png'];
        saveas(fig, fullfile('analysis', 'output', filename));
        close(fig);
        
        results.(alg).plot_filename = filename;
    end
    
    % Comparative analysis
    fig = figure('Visible', 'off');
    avg_times = [];
    for i = 1:length(algorithms)
        alg = algorithms{i};
        avg_times = [avg_times, results.(alg).avg_time];
    end
    
    bar(avg_times);
    set(gca, 'XTickLabel', algorithms);
    title('Average Execution Time Comparison');
    ylabel('Time (ms)');
    
    comp_filename = ['comparative_analysis_' datestr(now, 'yyyymmdd_HHMMSS') '.png'];
    saveas(fig, fullfile('analysis', 'output', comp_filename));
    close(fig);
    
    results.comparative_plot = comp_filename;
end