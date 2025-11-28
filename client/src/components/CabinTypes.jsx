import React from "react";

function CabinTypes({ boatDetail }) {
    const types = boatDetail?.cabinTypes || [];
    if (!types.length) return <p>등록된 캐빈 타입이 없습니다.</p>;

    return (
        <div style={{ display: "grid", gap: 16, padding: 16 }}>
            {types.map((ct, i) => (
                <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                    <h4 style={{ margin: "4px 0 8px" }}>
                        {ct.name} {ct.deck ? <small>· {ct.deck}</small> : null}
                    </h4>
                    {ct.media?.[0]?.image && (
                        <img
                            src={ct.media[0].image}
                            alt={ct.name}
                            style={{ width: "100%", borderRadius: 6, marginBottom: 8 }}
                        />
                    )}
                    {ct.description && (
                        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ct.description}</p>
                    )}
                    {!!ct.cabins?.length && (
                        <details>
                            <summary>View cabin list</summary>
                            <ul style={{ marginTop: 6 }}>
                                {ct.cabins.map((c) => (
                                    <li key={c.id || c.name}>{c.name}</li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>
            ))}
        </div>
    );
}

export default CabinTypes;
