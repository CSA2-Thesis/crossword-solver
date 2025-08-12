import io
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

def generate_png_image(puzzle, show_answers=True):
    cell_size = 40        
    cell_margin = 1.1      
    outer_padding = 20     
    
    grid = puzzle['grid']
    clues = puzzle['clues']
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    
    total_width = int(round(cols * cell_size + (cols - 1) * cell_margin + 2 * outer_padding))
    total_height = int(round(rows * cell_size + (rows - 1) * cell_margin + 2 * outer_padding))
    
    img = Image.new('RGB', (total_width, total_height), 'white')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("arial.ttf", 16)
        number_font = ImageFont.truetype("arial.ttf", 10)
    except:
        font = ImageFont.load_default()
        number_font = ImageFont.load_default()
    
    number_map = {}
    for direction in ['across', 'down']:
        for clue in clues.get(direction, []):
            number_map[(clue['y'], clue['x'])] = clue['number']
    
    for y in range(rows):
        for x in range(cols):
            x_pos = outer_padding + x * (cell_size + cell_margin)
            y_pos = outer_padding + y * (cell_size + cell_margin)
            
            x0, y0 = int(round(x_pos)), int(round(y_pos))
            x1, y1 = x0 + cell_size, y0 + cell_size
            
            if grid[y][x] == '.':
                draw.rectangle(
                    [x0, y0, 
                     int(round(x_pos + cell_size + cell_margin)), 
                     int(round(y_pos + cell_size + cell_margin))]
                )
            else:
                draw.rectangle(
                    [x0, y0, x1, y1],
                    fill='white',
                    outline='black',
                    width=1
                )
                
                if (y, x) in number_map:
                    draw.text(
                        (x0 + 3, y0 + 3),
                        str(number_map[(y, x)]),
                        fill='black',
                        font=number_font
                    )
                
                if show_answers:
                    draw.text(
                        (x0 + cell_size//2, y0 + cell_size//2),
                        grid[y][x],
                        fill='black',
                        font=font,
                        anchor='mm'
                    )
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()

def generate_pdf(puzzle, show_answers=True):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph("<b>Crossword Puzzle</b>", styles['Title']))
    story.append(Spacer(1, 0.2*inch))
    
    png_data = generate_png_image(puzzle, show_answers)
    img = RLImage(io.BytesIO(png_data), width=6*inch, height=6*inch)
    story.append(img)
    story.append(Spacer(1, 0.3*inch))
    
    story.append(Paragraph("<b>Clues</b>", styles['Heading2']))
    story.append(Spacer(1, 0.1*inch))
    
    story.append(Paragraph("<b>Across</b>", styles['Heading3']))
    for clue in puzzle['clues'].get('across', []):
        clue_text = f"{clue['number']}. {clue['clue']}"
        if show_answers:
            clue_text += f" <i>({clue['answer']})</i>"
        story.append(Paragraph(clue_text, styles['Normal']))
        story.append(Spacer(1, 0.05*inch))
    
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("<b>Down</b>", styles['Heading3']))
    for clue in puzzle['clues'].get('down', []):
        clue_text = f"{clue['number']}. {clue['clue']}"
        if show_answers:
            clue_text += f" <i>({clue['answer']})</i>"
        story.append(Paragraph(clue_text, styles['Normal']))
        story.append(Spacer(1, 0.05*inch))
    
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
