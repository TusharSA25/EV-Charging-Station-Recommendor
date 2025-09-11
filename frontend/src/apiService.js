const API_URL = "http://localhost:5000";

export const checkModelStatus = async () => {
    const response = await fetch(`${API_URL}/status`);
    if (!response.ok) {
        throw new Error("Failed to fetch model status");
    }
    return response.json();
};

export const trainModel = async (algorithm = "random_forest") => {
    const response = await fetch(`${API_URL}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ algorithm }),
    });
    if (!response.ok) {
        throw new Error("Failed to train the model");
    }
    return response.json();
};

export const predictRating = async (userFeatures, stationFeatures) => {
    const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_features: userFeatures, station_features: stationFeatures }),
    });
    if (!response.ok) {
        throw new Error("Failed to predict station rating");
    }
    return response.json();
};