import React, { useState } from 'react';

function TripImageGallery({ images, layoutImage }) {
  // ✅ URL 자동 보정 로직 추가
  const allImages = Array.isArray(images)
    ? images.map((img) => {
      let fixedUrl = img.url;
      // http(s)로 시작하지 않으면 inseanq CDN prefix 추가
      if (fixedUrl && !/^https?:\/\//i.test(fixedUrl)) {
        fixedUrl = `https://app.inseanq.com/${fixedUrl.replace(/^\/+/, "")}`;
      }
      return { ...img, url: fixedUrl };
    })
    : [];
  if (layoutImage) {
    allImages.push({ url: layoutImage, caption: 'Layout' });
  }

  const [mainImage, setMainImage] = useState(allImages[0] || null);

  console.log("TripImageGallery images props:", images);
  console.log("allImages:", allImages);
  console.log("mainImage:", mainImage);

  if (!mainImage) {

    return (
      <div className="trip-image-gallery">
        <div className="main-image">
          <img
            src="https://app.inseanq.com/images/default-boat.jpg"
            alt="기본 이미지"
            style={{
              width: "100%",
              maxHeight: "400px",
              objectFit: "cover",
              borderRadius: "8px"
            }}
          />
        </div>

        <p style={{ textAlign: "center", color: "#888", marginTop: "8px" }}>
          등록된 이미지가 없습니다.
        </p>
      </div>
    );
  }

  // ✅ 정상적으로 이미지가 있을 때 표시
  return (
    <div className="trip-image-gallery">
      <div className="main-image" style={{ textAlign: "center" }}>
        <img
          src={mainImage.url}
          alt={mainImage.caption}
          style={{
            width: "100%",
            maxWidth: "900px",     // ✅ 최대 가로 크기 제한
            maxHeight: "500px",    // ✅ 너무 세로로 커지지 않게
            objectFit: "cover",    // ✅ 비율 유지하며 잘림 처리
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        />
      </div>

      <div className="thumbnail-list"
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '8px',
          overflowX: 'auto',        // ✅ 가로 스크롤 활성화
          paddingBottom: '8px',
          scrollbarWidth: 'thin',   // ✅ 스크롤바 얇게
        }}
      >
        {allImages.map((img, idx) => (
          <img
            key={idx}
            src={img.url}
            alt={img.caption}
            style={{
              width: '100px',
              height: '70px',
              objectFit: 'cover',
              cursor: 'pointer',
              border: img.url === mainImage.url ? '3px solid #007BFF' : '2px solid transparent',
              borderRadius: '6px',
              flexShrink: 0,          // ✅ 스크롤 시 이미지 크기 고정
              transition: 'transform 0.2s ease, border 0.2s ease',
            }}
            onClick={() => setMainImage(img)}
            onMouseEnter={() => setMainImage(img)}
          />
        ))}
      </div>

    </div>
  );
}


export default TripImageGallery;
