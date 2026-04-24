setActiveNav("eda");

let availableCountriesLoaded = false;

function selectAllCountries(select) {
  document.querySelectorAll('#countryCheckboxes .country-label:not(.hidden) input[type="checkbox"]').forEach(cb => {
    cb.checked = select;
  });
}

function filterCountries() {
  const searchText = (document.getElementById('countrySearch').value || '').toLowerCase();
  const labels = document.querySelectorAll('#countryCheckboxes .country-label');
  labels.forEach(label => {
    const countryName = label.querySelector('span').textContent.toLowerCase();
    if (countryName.includes(searchText)) {
      label.classList.remove('hidden');
      label.classList.add('flex');
    } else {
      label.classList.add('hidden');
      label.classList.remove('flex');
    }
  });
}

function getSelectedCountriesStr() {
  if (!availableCountriesLoaded) return "中国,美国,德国,日本,俄罗斯";
  const checked = Array.from(document.querySelectorAll('#countryCheckboxes input:checked')).map(cb => cb.value);
  return checked.join(',');
}

function applyCountrySelection() {
  const queryCountries = getSelectedCountriesStr();
  if (!queryCountries) {
    alert("请至少选择一个国家！");
    return;
  }
  loadEdaData();
}

async function loadEdaData() {
  toggleLoader(true);
  try {
    let queryCountries = "中国,美国,德国,日本,俄罗斯";
    if (availableCountriesLoaded) {
      const checked = Array.from(document.querySelectorAll('#countryCheckboxes input:checked')).map(cb => cb.value);
      if (checked.length === 0) {
        alert("请至少选择一个国家！");
        toggleLoader(false);
        return;
      }
      queryCountries = checked.join(',');
    }

    const data = await fetchJson(`${API_BASE}/eda?countries=${encodeURIComponent(queryCountries)}`);

    if (!availableCountriesLoaded && data.available_countries) {
      const container = document.getElementById('countryCheckboxes');
      container.innerHTML = '';
      const defaultList = queryCountries.split(',');
      data.available_countries.forEach(c => {
        const isChecked = defaultList.includes(c) ? 'checked' : '';
        container.innerHTML += `
          <label class="country-label flex items-center space-x-1.5 text-sm cursor-pointer hover:bg-cyan-500/20 p-1 rounded transition-colors text-slate-300">
            <input type="checkbox" value="${c}" class="rounded border-cyan-500/50 bg-slate-800 text-cyan-500 focus:ring-cyan-500 w-4 h-4" ${isChecked}>
            <span class="truncate" title="${c}">${c}</span>
          </label>
        `;
      });
      availableCountriesLoaded = true;
    }

    const traces = [];
    traces.push({
      x: data.brent.map(d => d['日期']),
      y: data.brent.map(d => d['布伦特原油价格(美元)_全球']),
      name: '布伦特原油 (左轴)',
      line: { color: 'rgba(255,255,255,0.5)', dash: 'dash', width: 3 },
      yaxis: 'y1'
    });

    const colors = ['#00E5FF', '#D500F9', '#00E676', '#FF3D00', '#FFEA00', '#2979FF', '#F50057', '#00B0FF'];
    let i = 0;
    for (const [country, records] of Object.entries(data.countries)) {
      traces.push({
        x: records.map(d => d['日期']),
        y: records.map(d => d['汽油价格(美元/升)_全球']),
        name: `${country} 汽油`,
        line: { width: country === '中国' ? 4 : 2, color: colors[i % colors.length] },
        yaxis: 'y2'
      });
      i++;
    }

    const layoutLine = {
      template: 'plotly_dark',
      dragmode: 'pan',
      margin: { t: 40, b: 40, l: 40, r: 60 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      hovermode: 'x unified',
      xaxis: { gridcolor: 'rgba(0,229,255,0.1)', tickfont: { family: 'Rajdhani' } },
      yaxis: { title: '布伦特原油价格 (美元/桶)', gridcolor: 'rgba(0,229,255,0.1)', titlefont: { family: 'Rajdhani' }, tickfont: { family: 'Rajdhani' } },
      yaxis2: { title: '国内汽油价格 (美元/升)', overlaying: 'y', side: 'right', gridcolor: 'rgba(0,229,255,0.1)', titlefont: { family: 'Rajdhani' }, tickfont: { family: 'Rajdhani' } },
      legend: { x: 1.02, y: 1, bgcolor: 'rgba(11,15,25,0.8)', bordercolor: 'rgba(0,229,255,0.3)', borderwidth: 1, font: { color: '#e2e8f0', family: 'Rajdhani' } },
      hoverlabel: { bgcolor: "rgba(11,15,25,0.95)", bordercolor: "#00E5FF", font: { color: "#F8FAFC", family: "Rajdhani" } }
    };

    const config = {
      responsive: true,
      displayModeBar: false
    };

    Plotly.newPlot('edaLineChart', traces, layoutLine, config);

    const heatmapData = [{
      z: data.correlation.z,
      x: data.correlation.x,
      y: data.correlation.y,
      type: 'heatmap',
      colorscale: 'RdBu',
      reversescale: false,
      zmin: 0.95,
      zmax: 1.0,
      texttemplate: '%{z:.4f}',
      xgap: 1,
      ygap: 1,
      hoverlabel: { font: { family: 'Rajdhani' } }
    }];

    const heatmapLayout = {
      template: 'plotly_dark',
      dragmode: 'pan',
      margin: { t: 40, b: 80, l: 80, r: 40 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      xaxis: { tickangle: -45, tickfont: { family: 'Rajdhani' } },
      yaxis: { tickfont: { family: 'Rajdhani' } }
    };

    Plotly.newPlot('edaHeatmapChart', heatmapData, heatmapLayout, config);
  } catch (e) {
    console.error(e);
    alert('后端 API 请求失败，请确认 FastAPI 已启动！');
  } finally {
    toggleLoader(false);
  }
}

window.addEventListener("load", () => {
  loadEdaData();
});

