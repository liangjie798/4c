from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pathlib import Path
import os
import json
import numpy as np
from functools import lru_cache

app = FastAPI(title="全球能源危机抗风险评估 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "数据"
COUNTRY_SPLIT_DIR = DATA_DIR / "按国家拆分数据"

EN_TO_CN = {
    'United States': '美国',
    'Canada': '加拿大',
    'Mexico': '墨西哥',
    'Brazil': '巴西',
    'Argentina': '阿根廷',
    'Colombia': '哥伦比亚',
    'Chile': '智利',
    'Peru': '秘鲁',
    'Venezuela': '委内瑞拉',
    'Ecuador': '厄瓜多尔',
    'United Kingdom': '英国',
    'Germany': '德国',
    'France': '法国',
    'Italy': '意大利',
    'Spain': '西班牙',
    'Netherlands': '荷兰',
    'Belgium': '比利时',
    'Sweden': '瑞典',
    'Norway': '挪威',
    'Denmark': '丹麦',
    'Finland': '芬兰',
    'Poland': '波兰',
    'Portugal': '葡萄牙',
    'Greece': '希腊',
    'Switzerland': '瑞士',
    'Austria': '奥地利',
    'Ireland': '爱尔兰',
    'Hungary': '匈牙利',
    'Czech Republic': '捷克共和国',
    'Romania': '罗马尼亚',
    'Russia': '俄罗斯',
    'Ukraine': '乌克兰',
    'Turkey': '土耳其',
    'China': '中国',
    'Japan': '日本',
    'South Korea': '韩国',
    'India': '印度',
    'Indonesia': '印度尼西亚',
    'Malaysia': '马来西亚',
    'Thailand': '泰国',
    'Vietnam': '越南',
    'Philippines': '菲律宾',
    'Bangladesh': '孟加拉国',
    'Pakistan': '巴基斯坦',
    'Sri Lanka': '斯里兰卡',
    'Nepal': '尼泊尔',
    'Myanmar': '缅甸',
    'Singapore': '新加坡',
    'Hong Kong': '香港',
    'Taiwan': '台湾',
    'Australia': '澳大利亚',
    'New Zealand': '新西兰',
    'Saudi Arabia': '沙特阿拉伯',
    'UAE': '阿联酋',
    'Kuwait': '科威特',
    'Qatar': '卡塔尔',
    'Iran': '伊朗',
    'Iraq': '伊拉克',
    'Israel': '以色列',
    'Jordan': '约旦',
    'Lebanon': '黎巴嫩',
    'Egypt': '埃及',
    'South Africa': '南非',
    'Nigeria': '尼日利亚',
    'Kenya': '肯尼亚',
    'Ethiopia': '埃塞俄比亚',
    'Ghana': '加纳',
    'Tanzania': '坦桑尼亚',
    'Morocco': '摩洛哥',
    'Algeria': '阿尔及利亚',
    'Libya': '利比亚',
    'Tunisia': '突尼斯',
    'Angola': '安哥拉',
    'Mozambique': '莫桑比克',
    'Zambia': '赞比亚',
    'Zimbabwe': '津巴布韦',
    'Uganda': '乌干达',
    'Cameroon': '喀麦隆',
    'Senegal': '塞内加尔',
    'Ivory Coast': '科特迪瓦',
    'Sudan': '苏丹',
    'Botswana': '博茨瓦纳',
    'Namibia': '纳米比亚',
    'Rwanda': '卢旺达',
}
CN_TO_EN = {v: k for k, v in EN_TO_CN.items()}


def _entropy_weights(X: np.ndarray) -> np.ndarray:
    X_mat = np.array(X, dtype=float)
    n_samples, n_features = X_mat.shape
    epsilon = 1e-9
    X_norm_sum = np.sum(X_mat, axis=0) + epsilon
    P = X_mat / X_norm_sum
    E = np.zeros(n_features)
    for j in range(n_features):
        if np.nanmax(X_mat[:, j]) == np.nanmin(X_mat[:, j]):
            E[j] = 1.0
        else:
            E[j] = - (1.0 / np.log(n_samples)) * np.nansum(P[:, j] * np.log(P[:, j] + epsilon))
    D = 1.0 - E
    if np.sum(D) == 0:
        return np.ones(n_features) / n_features
    return D / np.sum(D)


def _minmax_normalize_with_direction(X: np.ndarray, directions: list[int]) -> np.ndarray:
    X_mat = np.array(X, dtype=float)
    n_samples, n_features = X_mat.shape
    X_norm = np.zeros_like(X_mat, dtype=float)
    for j in range(n_features):
        col = X_mat[:, j]
        col_min = np.nanmin(col)
        col_max = np.nanmax(col)
        if col_max == col_min:
            X_norm[:, j] = 0.0
        elif directions[j] == 1:
            X_norm[:, j] = (col - col_min) / (col_max - col_min)
        else:
            X_norm[:, j] = (col_max - col) / (col_max - col_min)
    return X_norm


@app.get("/api/topsis_weights")
def get_topsis_weights():
    df = load_csv("国家抗风险评估结果")
    cols = ['价格暴涨率(MDD_%)', '波动率(Volatility)', '恢复时间(周_TTR)', '韧性积分(Resilience)']
    for c in cols:
        if c not in df.columns:
            raise HTTPException(status_code=404, detail=f"结果数据缺少列: {c}")
        df[c] = pd.to_numeric(df[c], errors="coerce")
    X = df[cols].dropna().values
    if len(X) < 2:
        raise HTTPException(status_code=400, detail="可用于权重计算的数据行数不足")
    directions = [-1, -1, -1, 1]
    ahp = np.array([0.35, 0.20, 0.20, 0.25], dtype=float)
    X_norm = _minmax_normalize_with_direction(X, directions)
    ew = _entropy_weights(X_norm)
    combined = (ew * ahp)
    if np.sum(combined) == 0:
        combined = np.ones_like(combined) / len(combined)
    else:
        combined = combined / np.sum(combined)
    return {
        "metrics": ["价格暴涨率(MDD)", "波动率(Volatility)", "恢复时间(TTR)", "韧性积分(Resilience)"],
        "ahp": ahp.tolist(),
        "entropy": ew.tolist(),
        "combined": combined.tolist(),
    }


def load_csv(keyword: str) -> pd.DataFrame:
    """根据关键字加载 CSV，并处理常见的空值/NaN，转换为 JSON 兼容格式"""
    if not DATA_DIR.exists():
        raise HTTPException(status_code=404, detail="数据文件夹不存在")

    for f in os.listdir(DATA_DIR):
        if keyword in f and f.endswith(".csv"):
            df = pd.read_csv(DATA_DIR / f, encoding="utf-8-sig")
            df = df.replace({np.nan: None, np.inf: None, -np.inf: None})
            return df

    raise HTTPException(status_code=404, detail=f"未找到包含关键字 '{keyword}' 的数据文件")


@lru_cache(maxsize=1)
def _country_profiles_cached() -> list[dict]:
    if not COUNTRY_SPLIT_DIR.exists():
        raise HTTPException(status_code=404, detail="未找到按国家拆分数据目录")

    profiles: list[dict] = []
    for p in sorted(COUNTRY_SPLIT_DIR.glob("*_燃料价格.csv")):
        try:
            df = pd.read_csv(
                p,
                encoding="utf-8-sig",
                usecols=["国家", "地区", "收入水平", "补贴水平", "税收百分比"],
            )
        except Exception:
            df = pd.read_csv(p, usecols=["国家", "地区", "收入水平", "补贴水平", "税收百分比"])

        if df.empty:
            continue

        country = str(df["国家"].dropna().iloc[0]) if df["国家"].notna().any() else p.stem.split("_")[0]
        region = str(df["地区"].dropna().iloc[0]) if df["地区"].notna().any() else ""
        income = str(df["收入水平"].dropna().iloc[0]) if df["收入水平"].notna().any() else ""
        subsidy = str(df["补贴水平"].dropna().iloc[0]) if df["补贴水平"].notna().any() else ""
        tax = pd.to_numeric(df["税收百分比"], errors="coerce")
        avg_tax = float(tax.mean()) if tax.notna().any() else None

        profiles.append(
            {
                "country": country,
                "country_en": CN_TO_EN.get(country),
                "region": region,
                "income_level": income,
                "subsidy_level": subsidy,
                "tax_percentage": avg_tax,
            }
        )

    profiles.sort(key=lambda x: x["country"])
    return profiles


@app.get("/api/country_profiles")
def get_country_profiles(country: str = ""):
    profiles = _country_profiles_cached()
    if country:
        hit = next((p for p in profiles if p["country"] == country), None)
        if not hit:
            raise HTTPException(status_code=404, detail="未找到该国家")
        return hit
    return profiles


@app.get("/")
def read_root():
    return {"message": "欢迎访问全球能源危机抗风险评估后端 API"}


@app.get("/api/eda")
def get_eda_data(countries: str = "中国,美国,德国,日本,俄罗斯"):
    df = load_csv("燃料价格宽表_预处理完成")

    if '日期' in df.columns:
        df['日期'] = pd.to_datetime(df['日期']).dt.strftime('%Y-%m-%d')

    brent_data = df[df['国家_全球'] == '美国'].sort_values('日期')[['日期', '布伦特原油价格(美元)_全球']]

    country_list = [c.strip() for c in countries.split(",")]
    country_data = {}

    for c in country_list:
        c_df = df[df['国家_全球'] == c].sort_values('日期')[['日期', '汽油价格(美元/升)_全球']]
        if not c_df.empty:
            country_data[c] = c_df.to_dict(orient="records")

    corr_df = brent_data.copy()
    corr_df = corr_df.rename(columns={'布伦特原油价格(美元)_全球': '布伦特原油'}).set_index('日期')

    for c in country_list:
        c_df = df[df['国家_全球'] == c].sort_values('日期')[['日期', '汽油价格(美元/升)_全球']]
        if not c_df.empty:
            c_series = c_df.set_index('日期')['汽油价格(美元/升)_全球']
            corr_df = corr_df.join(c_series.rename(c), how='inner')

    corr_df = corr_df.dropna()
    corr_matrix = corr_df.corr(method='pearson')
    corr_matrix = corr_matrix.replace({np.nan: None})

    z_values = corr_matrix.values.tolist()
    x_labels = corr_matrix.columns.tolist()
    y_labels = corr_matrix.index.tolist()

    return {
        "brent": brent_data.to_dict(orient="records"),
        "countries": country_data,
        "available_countries": df['国家_全球'].dropna().unique().tolist(),
        "correlation": {
            "z": z_values,
            "x": x_labels,
            "y": y_labels
        }
    }


@app.get("/api/beta")
def get_beta_data(top_n: int = 100, countries: str = ""):
    df = load_csv("Beta榜单")

    if countries:
        country_list = [c.strip() for c in countries.split(",")]
        df = df[df['国家'].isin(country_list)]

    df = df.sort_values("价格传导系数(Beta)", ascending=True).head(top_n)
    return df.to_dict(orient="records")


@app.get("/api/var_irf")
def get_var_irf_data():
    df = load_csv("VAR_IRF_China_IRF数值")
    return df.to_dict(orient="records")


@app.get("/api/china_fuel_history")
def get_china_fuel_history():
    df = load_csv("中国燃料价格数据")
    # 修复 BOM 和列名解析问题
    df.rename(columns={df.columns[0]: "日期"}, inplace=True)
    # 确保日期格式规范并按时间排序
    if '日期' in df.columns:
        df['日期'] = pd.to_datetime(df['日期']).dt.strftime('%Y-%m-%d')
        df = df.sort_values('日期')
    
    return df.to_dict(orient="records")


@app.get("/api/topsis")
def get_topsis_data(metric: str = "综合稳定性得分(C)", top_n: int = 100):
    df = load_csv("国家抗风险评估结果")

    if metric not in df.columns:
        raise HTTPException(status_code=400, detail=f"无效的指标名称: {metric}")

    ascending = True if metric not in ['韧性积分(Resilience)', '综合稳定性得分(C)', '基准预测_R²'] else False
    df = df.sort_values(by=metric, ascending=ascending).head(top_n)

    return {
        "metric": metric,
        "data": df.to_dict(orient="records")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
