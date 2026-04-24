setActiveNav("irf");

async function loadIrfData() {
  toggleLoader(true);
  try {
    const data = await fetchJson(`${API_BASE}/var_irf`);
    const weeks = data.map(d => d['冲击发生后时间(周)']);
    const responseVals = data.map(d => d['价格响应预测值(美元)']);
    const lower = data.map(d => d['95%置信区间下限']);
    const upper = data.map(d => d['95%置信区间上限']);

    const traceArea = {
      x: weeks.concat(weeks.slice().reverse()),
      y: upper.concat(lower.slice().reverse()),
      fill: 'toself',
      fillcolor: 'rgba(0,229,255,0.15)',
      line: { color: 'rgba(255,255,255,0)' },
      name: '95% 置信区间',
      hoverinfo: 'skip'
    };

    const traceLine = {
      x: weeks,
      y: responseVals,
      mode: 'lines+markers',
      line: { color: '#00E5FF', width: 3 },
      marker: { color: '#F8FAFC', size: 6, line: { color: '#00E5FF', width: 2 } },
      name: '中国汽油价格响应'
    };

    const layout = {
      template: 'plotly_dark',
      dragmode: 'pan',
      title: { text: '国际原油价格突增对中国国内油价的动态冲击', font: { family: 'Orbitron', color: '#00E5FF' } },
      margin: { t: 60, b: 40, l: 50, r: 20 },
      xaxis: { title: '冲击发生后的时间 (周)', gridcolor: 'rgba(0,229,255,0.1)', titlefont: { family: 'Rajdhani' }, tickfont: { family: 'Rajdhani' } },
      yaxis: { title: '价格变动幅度 (美元)', gridcolor: 'rgba(0,229,255,0.1)', titlefont: { family: 'Rajdhani' }, tickfont: { family: 'Rajdhani' } },
      hovermode: 'x unified',
      shapes: [{
        type: 'line',
        x0: 0, x1: Math.max(...weeks),
        y0: 0, y1: 0,
        line: { color: '#D500F9', width: 2, dash: 'dash' }
      }],
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(11,15,25,0.8)', bordercolor: 'rgba(0,229,255,0.3)', borderwidth: 1, font: { family: 'Rajdhani', color: '#F8FAFC' } },
      hoverlabel: { bgcolor: "rgba(11,15,25,0.95)", bordercolor: "#00E5FF", font: { color: "#F8FAFC", family: "Rajdhani" } }
    };

    Plotly.newPlot('irfChart', [traceArea, traceLine], layout, { responsive: true, displayModeBar: false });

    // ==== 渲染右侧中国地图 ====
    const mapTrace = {
      type: 'choropleth',
      locationmode: 'country names',
      locations: ['China'],
      z: [1],
      text: ['中国大陆'],
      colorscale: [
        [0, '#00E5FF'],
        [1, '#00E5FF']
      ],
      showscale: false,
      marker: { line: { color: '#D500F9', width: 1.5 } },
      hoverinfo: 'text'
    };

    const mapLayout = {
      template: 'plotly_dark',
      margin: { t: 0, b: 0, l: 0, r: 0 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      geo: {
        scope: 'asia', // 聚焦亚洲区域
        resolution: 50,
        showframe: false,
        showcoastlines: true,
        coastlinecolor: 'rgba(0,229,255,0.2)',
        showcountries: true,
        countrycolor: 'rgba(0,229,255,0.1)',
        showocean: false,
        landcolor: 'rgba(15,23,42,0.6)',
        bgcolor: 'rgba(0,0,0,0)',
        center: { lon: 104, lat: 35 }, // 中国经纬度中心
        projection: {
          type: 'mercator',
          scale: 1.5 // 稍微调小一点放大比例，以适应变宽的容器
        }
      },
      dragmode: false // 禁止拖拽地图
    };

    Plotly.newPlot('chinaMap', [mapTrace], mapLayout, { responsive: true, displayModeBar: false });

  } catch (e) {
    console.error(e);
    alert('后端 API 请求失败，请确认 FastAPI 已启动！');
  } finally {
    toggleLoader(false);
  }
}

async function loadChinaFuelData() {
  toggleLoader(true);
  try {
    const data = await fetchJson(`${API_BASE}/china_fuel_history`);
    const dates = data.map(d => d['日期']);
    const brent = data.map(d => d['布伦特原油价格(美元)']);
    const gas = data.map(d => d['汽油价格(美元/升)']);
    const diesel = data.map(d => d['柴油价格(美元/升)']);
    const lpg = data.map(d => d['液化石油气价格(美元/升)']);

    // 左Y轴：汽柴油零售价 (相对平缓)
    const traceGas = {
      x: dates,
      y: gas,
      mode: 'lines',
      name: '中国汽油零售价 (美元/升)',
      line: { color: '#00E5FF', width: 2 },
      yaxis: 'y1'
    };

    const traceDiesel = {
      x: dates,
      y: diesel,
      mode: 'lines',
      name: '中国柴油零售价 (美元/升)',
      line: { color: '#2979FF', width: 2 },
      yaxis: 'y1'
    };

    const traceLpg = {
      x: dates,
      y: lpg,
      mode: 'lines',
      name: '中国液化石油气价格 (美元/升)',
      line: { color: '#00E676', width: 2 },
      yaxis: 'y1'
    };

    // 右Y轴：布伦特原油价 (波动剧烈)
    const traceBrent = {
      x: dates,
      y: brent,
      mode: 'lines',
      name: '国际布伦特原油 (美元/桶)',
      line: { color: '#D500F9', width: 2, dash: 'dot' },
      yaxis: 'y2'
    };

    // 天花板价 (130美元/桶)
    const traceCeiling = {
      x: [dates[0], dates[dates.length - 1]],
      y: [130, 130],
      mode: 'lines',
      name: '天花板价 (130美元)',
      line: { color: '#EF4444', width: 1.5, dash: 'dash' },
      yaxis: 'y2',
      hoverinfo: 'skip'
    };

    // 地板价 (40美元/桶)
    const traceFloor = {
      x: [dates[0], dates[dates.length - 1]],
      y: [40, 40],
      mode: 'lines',
      name: '地板价 (40美元)',
      line: { color: '#3B82F6', width: 1.5, dash: 'dash' },
      yaxis: 'y2',
      hoverinfo: 'skip'
    };

    const layout = {
      template: 'plotly_dark',
      dragmode: 'pan',
      title: { text: '国际原油暴涨暴跌 vs 国内成品油“熨平”走势实证', font: { family: 'Orbitron', color: '#00E5FF' } },
      margin: { t: 60, b: 40, l: 60, r: 60 },
      hovermode: 'x unified',
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      xaxis: { 
        gridcolor: 'rgba(0,229,255,0.1)', 
        tickfont: { family: 'Rajdhani' },
        type: 'date'
      },
      yaxis: { 
        title: '中国零售价 (美元/升)', 
        gridcolor: 'rgba(0,229,255,0.1)', 
        titlefont: { family: 'Rajdhani', color: '#00E5FF' }, 
        tickfont: { family: 'Rajdhani', color: '#00E5FF' }
      },
      yaxis2: { 
        title: '布伦特原油 (美元/桶)', 
        titlefont: { family: 'Rajdhani', color: '#D500F9' }, 
        tickfont: { family: 'Rajdhani', color: '#D500F9' },
        overlaying: 'y',
        side: 'right',
        showgrid: false
      },
      legend: { 
        orientation: 'h', 
        y: -0.15, 
        x: 0.5, 
        xanchor: 'center', 
        font: { family: 'Rajdhani', color: '#F8FAFC' } 
      },
      hoverlabel: { bgcolor: "rgba(11,15,25,0.95)", bordercolor: "#00E5FF", font: { color: "#F8FAFC", family: "Rajdhani" } }
    };

    Plotly.newPlot('chinaFuelChart', [traceGas, traceDiesel, traceLpg, traceBrent, traceCeiling, traceFloor], layout, { responsive: true, displayModeBar: false });
  } catch (e) {
    console.error(e);
    const el = document.getElementById('chinaFuelChart');
    if (el) el.innerHTML = '<div class="text-sm text-gray-500 flex justify-center items-center h-full">数据加载失败，请检查后端 API</div>';
  } finally {
    toggleLoader(false);
  }
}

window.addEventListener("load", () => {
  loadIrfData();
  loadChinaFuelData();
});

