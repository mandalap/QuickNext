<script>
document.addEventListener('DOMContentLoaded', function() {
    // Function to add labels to chart
    function addChartLabels() {
        const canvas = document.querySelector('[x-data*="chart"] canvas');
        if (!canvas) return;
        
        const chart = Chart.getChart(canvas);
        if (!chart) return;
        
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "bold 12px Arial";
        ctx.fillStyle = "#1f2937";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                if (value && value > 0) {
                    const x = bar.x;
                    const y = bar.y;
                    const formatted = "Rp " + parseFloat(value).toLocaleString("id-ID");
                    ctx.fillText(formatted, x, y - 8);
                }
            });
        });
        ctx.restore();
    }
    
    // Try to add labels after a short delay
    setTimeout(addChartLabels, 100);
    
    // Also listen for chart updates
    window.addEventListener('chart-updated', addChartLabels);
});
</script>

