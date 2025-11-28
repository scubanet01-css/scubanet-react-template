import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';

function CabinSelector({ trip, selectedCabins, onChange, currency }) {
  const [expandedCabinId, setExpandedCabinId] = useState(null);

  const spaceCabins = trip?.spaces?.cabinTypes || [];
  const ratePlans = trip?.ratePlansRetail || [];

  // 최저 요금이 있는 요금제를 자동 적용
  const lowestRatePlan = ratePlans.reduce((minPlan, currentPlan) => {
    const currentMin = Math.min(
      ...(currentPlan?.cabinTypes || []).flatMap(ct =>
        ct.occupancy.map(o => parseFloat(o.price))
      )
    );
    const minMin = minPlan
      ? Math.min(
        ...(minPlan?.cabinTypes || []).flatMap(ct =>
          ct.occupancy.map(o => parseFloat(o.price))
        )
      )
      : Infinity;
    return currentMin < minMin ? currentPlan : minPlan;
  }, null);

  const ratePlanCabins = lowestRatePlan?.cabinTypes || [];

  // 요금 정보 매핑: cabinTypeId → priceOptions[]
  const priceMap = {};

  ratePlanCabins.forEach(cabin => {
    if (!cabin?.id || !Array.isArray(cabin.occupancy)) return;

    // 🔸 baseOptions를 여기서 선언
    const baseOptions = cabin.occupancy.map(opt => {
      const occupancy = String(opt.id);
      let label = '';
      if (opt.id === 3) label = '독실 예약';
      else if (opt.id === 2) label = '2인 예약';
      else if (opt.id === 1) label = '1인 예약';
      return {
        occupancy,
        price: parseFloat(opt.price),
        label
      };
    });

    // ✅ 자동 2인 예약 옵션 추가 (id: 2가 없고, 1인 요금이 있으면)
    const hasOnePerson = baseOptions.find(o => o.occupancy === '1');
    const hasTwoPerson = baseOptions.find(o => o.occupancy === '2');
    if (!hasTwoPerson && hasOnePerson) {
      baseOptions.push({
        occupancy: '2',
        price: hasOnePerson.price,
        label: '2인 예약'
      });
    }



    // 🔸 최종적으로 priceMap에 저장
    priceMap[cabin.id] = baseOptions;
  });

  const handleOccupancyChange = (cabinId, occupancy, price, cabinName, label) => {
    const updated = selectedCabins.filter(sc => sc.cabinId !== cabinId);
    updated.push({
      cabinId,
      cabinName,              // ✅ 객실 이름 저장
      occupancyType: label,   // ✅ "1인 예약" 또는 "독방사용" 등 표시용 저장
      occupancyValue: occupancy, // ✅ 숫자값도 저장 (계산용)
      price
    });
    onChange(updated);
  };


  return (
    <div>
      <h3>🛏 객실과 인원을 선택해주세요!</h3>
      {spaceCabins.map((cabinType) => {
        const { id, name, cabins = [], availableSpaces = 0 } = cabinType;
        const priceOptions = priceMap[id] || [];
        const lowestPrice = priceOptions.length > 0
          ? Math.min(...priceOptions.map(p => p.price))
          : null;

        return (
          <div
            key={id}
            style={{ border: '1px solid #ccc', padding: '12px', marginBottom: '16px', borderRadius: '6px' }}
          >
            <h4>
              {name} {lowestPrice && <span style={{ color: '#555' }}>(from ${lowestPrice.toLocaleString()})</span>}
            </h4>
            <p>가용 인원: {availableSpaces} / 객실 수: {cabins.length}</p>

            {/* 객실 리스트 노출 */}
            {cabins.map(cabin => (
              <div key={cabin.id} style={{ marginTop: '8px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
                <strong>{cabin.name}</strong> - 가용 인원: {cabin.availableSpaces || 0}
                <br />
                {priceOptions.length > 0 && cabin.availableSpaces > 0 ? (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const occupancy = e.target.value;
                      const selected = priceOptions.find(p => p.occupancy === occupancy);
                      if (selected) {
                        handleOccupancyChange(
                          cabin.id,
                          occupancy,
                          selected.price,
                          cabin.name,
                          selected.label
                        );
                      }
                    }}
                  >
                    <option value="">-- 인원 선택 --</option>

                    {priceOptions.map((opt, idx) => (
                      <option key={idx} value={opt.occupancy}>
                        {opt.label} : {formatCurrency(opt.price, currency)} /인
                      </option>
                    ))}

                  </select>
                ) : (
                  <p style={{ color: '#888' }}>예약 가능 인원이 없습니다</p>
                )}

              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default CabinSelector;
