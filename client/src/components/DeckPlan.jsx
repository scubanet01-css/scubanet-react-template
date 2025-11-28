import React from "react";

function DeckPlan({ boatDetail }) {
    const plans = boatDetail?.deckPlans || [];
    if (!plans.length) return <p>등록된 덱 플랜이 없습니다.</p>;

    return (
        <div style={{ padding: 16 }}>
            {plans.map((p, i) => (
                <img
                    key={i}
                    src={p.image}
                    alt={`Deck ${i + 1}`}
                    style={{
                        width: "100%",
                        maxWidth: 680,
                        display: "block",
                        marginBottom: 16,
                        borderRadius: 8,
                    }}
                />
            ))}
        </div>
    );
}

export default DeckPlan;
