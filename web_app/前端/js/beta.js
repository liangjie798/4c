setActiveNav("beta");

async function loadBetaData() {
  toggleLoader(true);
  try {
    const data = await fetchJson(`${API_BASE}/beta?top_n=100`);
    const countries = data.map(item => item['国家']);
    const values = data.map(item => item['价格传导系数(Beta)']);
    const ranks = data.map(item => item['全球排名']);

    // 突出显示“中国”标签，并补全所有国家的排名序号
    const yTickTexts = countries.map((c, idx) => {
      const rankText = `[${ranks[idx]}] ${c}`;
      if (c === '中国') return `<b><span style="color:#00E5FF; font-size:14px;">${rankText}</span></b>`;
      return rankText;
    });

    const trace = {
      y: countries,
      x: values,
      type: 'bar',
      orientation: 'h',
      marker: {
        color: values,
        colorscale: [
          [0, '#00E5FF'],
          [0.5, '#2979FF'],
          [1, '#D500F9']
        ],
        cmin: Math.min(...values),
        cmax: Math.max(...values),
        line: { color: 'rgba(0,229,255,0.4)', width: 1 }
      },
      hoverlabel: { font: { family: 'Rajdhani' } },
      hovertemplate: '<b>%{y}</b><br>Beta: %{x:.4f}<extra></extra>'
    };

    // 动态计算合适的高度，避免拥挤缺失
    const chartHeight = Math.max(800, countries.length * 20 + 100);
    
    const layout = {
      template: 'plotly_dark',
      title: { text: '全球 84 个国家/地区 价格传导系数 Beta 榜单', font: { family: 'Orbitron', color: '#00E5FF' } },
      margin: { t: 60, b: 40, l: 140, r: 20 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      xaxis: { gridcolor: 'rgba(0,229,255,0.1)', title: 'Beta 传导系数', side: 'top', tickfont: { family: 'Rajdhani' } },
      yaxis: { 
        autorange: 'reversed', 
        tickfont: { size: 12, family: 'Rajdhani' },
        tickmode: 'array',
        tickvals: countries,
        ticktext: yTickTexts,
        dtick: 1 // 强制显示所有刻度，不省略
      },
      height: chartHeight,
      dragmode: 'pan'
    };

    Plotly.newPlot('betaChart', [trace], layout, { responsive: true, scrollZoom: true, displayModeBar: false });
    document.getElementById('betaChart').style.height = `${chartHeight}px`;
  } catch (e) {
    console.error(e);
    alert('后端 API 请求失败，请确认 FastAPI 已启动！');
  } finally {
    toggleLoader(false);
  }
}

window.addEventListener("load", () => {
  loadBetaData();
});

