import os
from PIL import Image

def main():
    img_path = r"c:\Users\admin\Desktop\Kello\public\images\home\media__1781241555167.png"
    if not os.path.exists(img_path):
        print(f"Error: Original image not found at {img_path}")
        return
        
    img = Image.open(img_path)
    width, height = img.size
    print(f"Original size: {width}x{height}")
    
    # media__1781241555167.png는 가로 448px, 세로 133px 정도의 비율을 가집니다.
    # 대략 우측 60% ~ 95% 구간에 쿠폰 카드가 위치합니다.
    # 정확한 좌표 크롭: (left, top, right, bottom)
    # 5% 쿠폰 이미지 크롭 영역
    left = int(width * 0.62)
    top = int(height * 0.12)
    right = int(width * 0.94)
    bottom = int(height * 0.90)
    
    cropped = img.crop((left, top, right, bottom))
    
    # 투명하게 배경 처리할 경우를 위해 PNG 포맷으로 저장
    output_dir = r"c:\Users\admin\Desktop\Kello\public\images\home"
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, "coupon_ticket.png")
    cropped.save(out_path, "PNG")
    print(f"Successfully cropped and saved to {out_path}")

if __name__ == "__main__":
    main()
