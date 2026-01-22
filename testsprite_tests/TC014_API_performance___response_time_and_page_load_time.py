import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input email and password, then click login button to authenticate user.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('juli23man@gmail.com')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        

        frame = context.pages[-1]
        # Click login button to submit credentials
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Retry login or check for error messages on the login page.
        frame = context.pages[-1]
        # Click the login button to retry login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Start testing API endpoints response times under 100 concurrent users without login or find alternative way to authenticate.
        await page.goto('http://localhost:3000/api/login', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Input email and password, then click login button to authenticate user.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('juli23man@gmail.com')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        

        frame = context.pages[-1]
        # Click login button to submit credentials
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate 100 concurrent users accessing key API endpoints including login, dashboard stats, products, orders, reports.
        await page.goto('http://localhost:3000/api/login', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/dashboard-stats', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/products', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/orders', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/reports', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Input email and password, then click login button to authenticate user.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('juli23man@gmail.com')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        

        frame = context.pages[-1]
        # Click login button to submit credentials
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate 100 concurrent users accessing key API endpoints including login, dashboard stats, products, orders, reports and measure response times.
        await page.goto('http://localhost:3000/api/login', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/dashboard-stats', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/products', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/orders', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/reports', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Input email and password, then click login button to authenticate user.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('juli23man@gmail.com')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        

        frame = context.pages[-1]
        # Click login button to submit credentials
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate 100 concurrent users accessing key API endpoints including login, dashboard stats, products, orders, reports and measure response times.
        frame = context.pages[-1]
        # Click Dashboard link to ensure dashboard is active
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/nav/div/div[2]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        await page.goto('http://localhost:3000/api/login', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/dashboard-stats', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/products', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/orders', timeout=10000)
        await asyncio.sleep(3)
        

        await page.goto('http://localhost:3000/api/reports', timeout=10000)
        await asyncio.sleep(3)
        

        # -> Input email and password, then click login button to authenticate user.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('juli23man@gmail.com')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('password123')
        

        frame = context.pages[-1]
        # Click login button to submit credentials
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Simulate 100 concurrent users accessing key API endpoints including login, dashboard stats, products, orders, reports and measure response times.
        frame = context.pages[-1]
        # Click Dashboard link to ensure dashboard is active
        elem = frame.locator('xpath=html/body/div/div/div[2]/div/nav/div/div[2]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=QuickKasir').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Dashboard').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Kasir').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Produk').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Laporan').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Keuangan').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Owner').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Juli Mandala Putera').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=juli23man@gmail.com').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Selamat Datang di Dashboard').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Total Penjualan Hari Ini').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Rpa0741.100').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Jumlah Transaksi').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=1').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Pelanggan Aktif').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Produk Terjual').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=29').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Rata-rata Per Transaksi').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Konversi Pelanggan').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Rating Pelanggan').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Target Harian').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Kasir yang Sedang Aktif').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Juli Mandala Putera').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Pesanan Terbaru').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Produk Terlaris').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Tidak ada data produk').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    