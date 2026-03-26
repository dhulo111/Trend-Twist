import io
from PIL import Image, ImageDraw
def test():
    try:
        img = Image.new('RGB', (100, 100), color = (73, 109, 137))
        d = ImageDraw.Draw(img)
        d.text((10,10), "Hello World", fill=(255,255,0))
        img.save('test_img.jpg')
        print("Pillow works!")
    except Exception as e:
        print(f"Pillow error: {e}")
if __name__ == '__main__':
    test()
