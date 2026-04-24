const { createApp, ref, computed, onMounted } = Vue;

const app = createApp({
  setup() {
    const profiles = ref([]);
    const searchQuery = ref('');
    const selectedProfile = ref({});
    const is3D = ref(true);
    let worldEl = null;
    let currentLon = 0;
    let isDragging = false; // 记录是否正在拖拽地图

    const availableCountries = computed(() => profiles.value.map(p => p.country));

    const loadWorldMap = async () => {
      toggleLoader(true);
      try {
        profiles.value = await fetchJson(`${API_BASE}/country_profiles`);

        const mapped = profiles.value.filter(p => !!p.country_en);
        const locations = mapped.map(p => p.country_en);
        const z = mapped.map(p => (p.tax_percentage == null ? null : p.tax_percentage));
        const text = mapped.map(p => p.country);
        const customdata = mapped.map(p => [
          p.country,
          p.region,
          p.income_level,
          p.subsidy_level,
          p.tax_percentage
        ]);

        const trace = {
          type: "choropleth",
          locationmode: "country names",
          locations,
          z: z.map(v => (v == null ? 0 : v)),
          text,
          customdata,
          colorscale: [
            [0, "rgba(15,23,42,0.8)"],
            [0.5, "rgba(41,121,255,0.6)"],
            [1, "#00E5FF"]
          ],
          colorbar: { title: "税收(%)", tickfont: { color: "#94A3B8" }, titlefont: { color: "#00E5FF" } },
          marker: { line: { color: "rgba(0,229,255,0.15)", width: 0.5 } },
          hovertemplate:
            "<b>%{customdata[0]}</b><br>" +
            "地区：%{customdata[1]}<br>" +
            "收入水平：%{customdata[2]}<br>" +
            "补贴水平：%{customdata[3]}<br>" +
            "税收百分比(均值)：%{customdata[4]:.2f}%<extra></extra>"
        };

        const hoverTrace = {
          type: "choropleth",
          locationmode: "country names",
          locations: [],
          z: [],
          customdata: [],
          colorscale: [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0)"]],
          showscale: false,
          hoverinfo: "skip",
          marker: { line: { color: "#00E5FF", width: 2.5 } },
          opacity: 1
        };

        const layout = {
          template: "plotly_dark",
          dragmode: 'pan',
          margin: { t: 10, b: 10, l: 10, r: 10 },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          hoverlabel: { bgcolor: "rgba(11,15,25,0.95)", bordercolor: "#00E5FF", font: { color: "#F8FAFC", family: "Rajdhani" } },
          geo: {
            projection: { 
              type: "orthographic",
              scale: 1 
            }, 
            showframe: false, // 彻底关闭原生的地理框架，因为它在低分辨率下会变成多边形/矩形，并会导致闪屏
            showcoastlines: true,
            coastlinecolor: "rgba(0,229,255,0.3)",
            showcountries: true,
            countrycolor: "rgba(0,229,255,0.2)",
            showocean: true,
            oceancolor: "rgba(11,15,25,0.3)",
            landcolor: "rgba(15,23,42,0.8)",
            bgcolor: "rgba(0,0,0,0)"
          }
        };

        Plotly.newPlot("worldMap", [trace, hoverTrace], layout, { 
          responsive: true, 
          displayModeBar: false,
          scrollZoom: false // 彻底禁止滚轮放大缩小
        });

        worldEl = document.getElementById("worldMap");
        if (worldEl) {
          let lastHover = null;

          // 移除自定义的滚轮缩放逻辑
          
          // 拦截鼠标拖拽事件：当用户手动拖拽地球（平移/旋转视角）时，暂停自转
          worldEl.addEventListener('mousedown', () => { isDragging = true; });
          worldEl.addEventListener('mouseup', () => { isDragging = false; });
          worldEl.addEventListener('mouseleave', () => { isDragging = false; });

          // 监听 relayout 事件同步用户拖拽后的实际经度
          worldEl.on("plotly_relayout", (ev) => {
            // 注意：Plotly在拖拽或放大时，可能会同时触发多个坐标系更新
            // 这里我们需要检查并安全地同步用户的拖拽视角
            if (ev) {
              // 优先使用确切的 lon 经度值
              if (ev['geo.projection.rotation.lon'] !== undefined) {
                currentLon = ev['geo.projection.rotation.lon'];
              } 
              // 处理可能的复合对象
              else if (ev['geo.projection.rotation'] && ev['geo.projection.rotation'].lon !== undefined) {
                currentLon = ev['geo.projection.rotation'].lon;
              }
            }
          });

          worldEl.on("plotly_hover", (ev) => {
            const p = ev?.points?.[0];
            if (!p) return;
            const loc = p.location;
            if (!loc || loc === lastHover) return;
            lastHover = loc;
            Plotly.update(worldEl, { locations: [[loc]], z: [[p.z ?? 0]], customdata: [[p.customdata]] }, {}, [1]);
          });

          worldEl.on("plotly_unhover", () => {
            lastHover = null;
            Plotly.update(worldEl, { locations: [[]], z: [[]], customdata: [[]] }, {}, [1]);
          });

          worldEl.on("plotly_click", (ev) => {
            const cd = ev?.points?.[0]?.customdata;
            if (!cd) return;
            const clickedCountry = cd[0];
            const p = profiles.value.find(x => x.country === clickedCountry);
            if (p) {
              selectedProfile.value = p;
              searchQuery.value = p.country;
            }
          });
        }

        const defaultCountry = profiles.value.some(p => p.country === "中国") ? "中国" : (profiles.value[0]?.country || "");
        if (defaultCountry) {
          searchQuery.value = defaultCountry;
          const p = profiles.value.find(x => x.country === defaultCountry);
          if (p) {
            selectedProfile.value = p;
            if (p.country_en) {
              const customdata = [p.country, p.region, p.income_level, p.subsidy_level, p.tax_percentage];
              Plotly.update(worldEl, { locations: [[p.country_en]], z: [[p.tax_percentage || 0]], customdata: [[customdata]] }, {}, [1]);
            }
          }
        }

        // 启动地球缓慢匀速自转
        setInterval(() => {
          if (is3D.value && worldEl && !isDragging) {
            if (typeof currentLon === 'number' && !isNaN(currentLon)) {
              currentLon = (currentLon + 0.45) % 360;
              Plotly.relayout(worldEl, {
                'geo.projection.rotation.lon': currentLon
              });
            } else {
              currentLon = 0;
            }
          }
        }, 60);

      } catch (e) {
        console.error(e);
        alert("后端 API 请求失败，请确认 FastAPI 已启动！");
      } finally {
        toggleLoader(false);
      }
    };

    const onSearch = () => {
      const v = (searchQuery.value || "").trim();
      const p = profiles.value.find(x => x.country === v);
      if (p) {
        selectedProfile.value = p;
        
        // 联动左侧地图：将搜索到的国家高亮
        if (worldEl && p.country_en) {
          const customdata = [
            p.country,
            p.region,
            p.income_level,
            p.subsidy_level,
            p.tax_percentage
          ];
          const z_val = p.tax_percentage == null ? 0 : p.tax_percentage;
          
          // 使用 update 替代 restyle 以防止视口位置重置或偏移
          Plotly.update(worldEl, 
            { 
              locations: [[p.country_en]], 
              z: [[z_val]], 
              customdata: [[customdata]] 
            }, 
            {}, 
            [1]
          );
        }
      }
    };

    const set3DMode = (mode) => {
      if (is3D.value === mode) return;
      is3D.value = mode;
      
      if (mode) {
        Plotly.relayout(worldEl, {
          'geo.projection.type': 'orthographic',
          'geo.showframe': false, 
          'geo.projection.scale': 1 
        });
      } else {
        Plotly.relayout(worldEl, {
          'geo.projection.type': 'natural earth',
          'geo.showframe': false, 
          'geo.projection.rotation.lon': 0, 
          'geo.projection.rotation.lat': 0,
          'geo.projection.scale': 1 
        });
      }
    };

    onMounted(() => {
      loadWorldMap();
    });

    return {
      searchQuery,
      selectedProfile,
      availableCountries,
      is3D,
      onSearch,
      set3DMode
    };
  }
});

app.mount('#app');
