setActiveNav("topsis");

async function loadTopsisWeights() {
  try {
    const result = await fetchJson(`${API_BASE}/topsis_weights`);
    const labels = result.metrics;
    const values = result.combined.map(v => v * 100);
    const trace = {
      labels,
      values,
      type: 'pie',
      hole: 0.55,
      textinfo: 'label+percent',
      hovertemplate: '%{label}<br>%{value:.1f}%<extra></extra>',
      marker: {
        colors: ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'], // 红色(暴涨), 黄色(波动), 蓝色(恢复时间), 紫色(韧性)
        line: { color: 'rgba(11,15,25,0.8)', width: 2 }
      },
      textfont: { family: 'Rajdhani', color: '#F8FAFC' }
    };
    const layout = {
      template: 'plotly_dark',
      dragmode: 'pan',
      margin: { t: 30, b: 30, l: 10, r: 10 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      legend: { 
        orientation: 'v', // 改为垂直排列
        x: 1.05, // 放到饼图右侧
        y: 0.5,
        font: { family: 'Rajdhani', color: '#94A3B8' } 
      },
      hoverlabel: { bgcolor: "rgba(11,15,25,0.95)", bordercolor: "#00E5FF", font: { color: "#F8FAFC", family: "Rajdhani" } }
    };
    Plotly.newPlot('topsisWeightsChart', [trace], layout, { responsive: true, displayModeBar: false });
  } catch (e) {
    const el = document.getElementById('topsisWeightsChart');
    if (el) el.innerHTML = '<div class="text-sm text-gray-500">权重数据加载失败</div>';
  }
}

async function loadTopsisData() {
  toggleLoader(true);
  const metric = document.getElementById('metricSelect').value;

  // 更新指标说明提示文本
  const descEl = document.getElementById('metricDesc');
  if (descEl) {
    let desc = '';
    switch (metric) {
      case '综合稳定性得分(C)':
        desc = '综合 AHP 和熵权法计算出的最终抗风险能力得分。';
        break;
      case '韧性积分(Resilience)':
        desc = '反映该国在面对价格冲击时的整体弹性和抗压能力。';
        break;
      case '价格暴涨率(MDD_%)':
        desc = '最大回撤/涨幅 (Maximum Drawdown)：表示危机期间价格波动的最大幅度，越低越稳定。';
        break;
      case '恢复时间(周_TTR)':
        desc = '价格受到冲击后，恢复到正常或稳定水平所需的周期（周）。';
        break;
      case '基准预测_RMSE':
        desc = '均方根误差 (Root Mean Square Error)：衡量预测模型与实际价格偏差的绝对大小，值越小说明预测越精准。';
        break;
      case '基准预测_R²':
        desc = '决定系数 (R-Squared)：衡量预测模型对实际价格走势的解释程度，取值越接近1说明拟合优度越高。';
        break;
    }
    descEl.textContent = desc;
  }

  try {
    const result = await fetchJson(`${API_BASE}/topsis?metric=${encodeURIComponent(metric)}&top_n=100`);
    const data = result.data;
    const countries = data.map(item => item['国家']);
    const values = data.map(item => item[metric]);

    // 使用排名的均匀分布来作为颜色映射基准，而不是原始数值，避免因第一名数值过高导致颜色断层
    const numItems = data.length;
    const colorValues = data.map((_, i) => numItems - 1 - i);

    // 突出显示“中国”标签
    const yTickTexts = countries.map(c => {
      if (c === '中国') return '<b><span style="color:#00E5FF; font-size:14px;">中国</span></b>';
      return c;
    });

    const trace = {
      y: countries,
      x: values,
      type: 'bar',
      orientation: 'h',
      hovertemplate: '<b>%{y}</b><br>得分/数值: %{x:.4f}<extra></extra>',
      marker: {
        color: colorValues,
        colorscale: [
          [0, '#00E5FF'],
          [0.5, '#2979FF'],
          [1, '#D500F9']
        ],
        cmin: 0,
        cmax: numItems > 1 ? numItems - 1 : 1,
        line: { color: 'rgba(0,229,255,0.4)', width: 1 }
      },
      hoverlabel: { font: { family: 'Rajdhani' } }
    };

    const chartHeight = Math.max(520, countries.length * 15 + 120);
    const layout = {
      template: 'plotly_dark',
      title: { text: `<b>${metric}</b> 全球排行榜（84 个国家/地区）`, font: { family: 'Orbitron', color: '#00E5FF' } },
      margin: { t: 60, b: 40, l: 140, r: 20 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      xaxis: { gridcolor: 'rgba(0,229,255,0.1)', side: 'top', tickfont: { family: 'Rajdhani' } },
      yaxis: { 
        autorange: 'reversed', 
        tickfont: { size: 11, family: 'Rajdhani' },
        tickmode: 'array',
        tickvals: countries,
        ticktext: yTickTexts
      },
      height: chartHeight,
      dragmode: 'pan'
    };

    Plotly.newPlot('topsisChart', [trace], layout, { responsive: true, scrollZoom: true, displayModeBar: false });
    document.getElementById('topsisChart').style.height = `${chartHeight}px`;
  } catch (e) {
    console.error(e);
    alert('后端 API 请求失败，请确认 FastAPI 已启动！');
  } finally {
    toggleLoader(false);
  }
}

window.addEventListener("load", () => {
  loadTopsisWeights();
  loadTopsisData();
});

