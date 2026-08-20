export default function RandomWeightedChoice(weights: { [key: number]: number }) {
    // Example input: { 'A': 0.5, 'B': 0.3, 'C': 0.2 }
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let randomVal = Math.random() * totalWeight;

    for (const [item, weight] of Object.entries(weights)) {
        if (randomVal < weight) return item;
        randomVal -= weight;
    }
    return Object.keys(weights)[0]
}