import { db } from './src/lib/db';

async function main() {
  console.log("Seeding Welcome Blog Post...");

  // Create a default category if it doesn't exist
  let category = await db.blogCategory.findFirst();
  if (!category) {
    category = await db.blogCategory.create({
      data: {
        name: "Announcements",
        slug: "announcements",
        description: "Official updates and announcements from HimaVolt."
      }
    });
  }

  const htmlContent = `
    <h1>Welcome to HimaVolt</h1>
    <p>It is with great pride that we introduce HimaVolt, Nepal's premier digital platform designed to transform the hospitality and culinary landscape. Built locally to address the specific needs of the Nepalese market, HimaVolt seamlessly bridges the gap between technology and exceptional service.</p>
    
    <p>Our mission is straightforward: to empower businesses with cutting edge tools and provide customers with an unparalleled, frictionless experience. Whether you operate a bustling cafe in Kathmandu or a serene resort in Pokhara, HimaVolt offers a comprehensive suite of solutions tailored to elevate your operations.</p>
    
    <h2>Core Features and Capabilities</h2>
    
    <h3>Advanced QR Table Ordering</h3>
    <p>The era of waiting for menus and struggling to flag down staff is over. HimaVolt's intuitive QR table ordering system allows patrons to simply scan, browse vivid digital menus, place their orders, and pay directly from their smartphones. This not only enhances customer satisfaction through sheer convenience but also significantly optimizes table turnover rates and reduces staff workload.</p>
    
    <h3>Comprehensive Food Delivery Network</h3>
    <p>Beyond the dining room, HimaVolt extends your reach directly to the doorsteps of your customers. Our robust delivery infrastructure connects your kitchen with a wide network of local patrons, supported by real time tracking and streamlined dispatch management. This ensures that every meal arrives fresh, accurate, and on time.</p>
    
    <h3>Integrated Hardware Solutions</h3>
    <p>We understand that software is only as good as the hardware it runs on. HimaVolt provides seamless integration with a variety of industry standard hardware, including kitchen display systems, receipt printers, and point of sale terminals. This holistic approach guarantees that orders flow instantly from the customer's device straight to the kitchen line without a single moment of delay.</p>
    
    <h3>Hotel and Stay Management</h3>
    <p>HimaVolt is not limited to restaurants. Our platform includes sophisticated tools for hotels and resorts, enabling comprehensive room service management, amenity booking, and guest communication. Elevate your guests' stay by offering them complete control over their experience directly from their mobile devices.</p>
    
    <h3>Dynamic Offers and Promotions</h3>
    <p>Attracting and retaining customers requires agility. The HimaVolt dashboard features a powerful promotional engine, allowing businesses to instantly deploy discounts, flash sales, and loyalty rewards. This direct line to your customer base ensures that your marketing efforts are both seen and utilized.</p>
    
    <h3>Powerful Analytics and Dashboard</h3>
    <p>Information is the cornerstone of business growth. The HimaVolt Master Admin and Partner dashboards provide granular, real time insights into sales trends, peak hours, popular items, and staff performance. Equip your management team with the data necessary to make informed, strategic decisions.</p>
    
    <h3>Streamlined Staff Management</h3>
    <p>Managing a team requires precision. Our built in staff management tools allow you to assign roles, track attendance, and monitor performance metrics. By streamlining administrative tasks, your team can focus entirely on delivering exceptional hospitality.</p>
    
    <h2>Join the Future of Nepalese Hospitality</h2>
    <p>HimaVolt represents more than just a software platform; it is a commitment to advancing the standard of service across Nepal. We invite restaurant owners, hoteliers, and service professionals to partner with us in this digital transformation.</p>
    
    <p>Explore the platform, discover the tools designed specifically for your growth, and experience the unparalleled efficiency of HimaVolt today.</p>
    
    <p><strong>Welcome to the new standard. Welcome to HimaVolt.</strong></p>
  `;

  // Check if post already exists
  const existingPost = await db.blogPost.findUnique({
    where: { slug: "welcome-to-himavolt" }
  });

  if (existingPost) {
    await db.blogPost.update({
      where: { slug: "welcome-to-himavolt" },
      data: {
        content: htmlContent,
        published: true
      }
    });
    console.log("Updated existing post.");
  } else {
    await db.blogPost.create({
      data: {
        title: "Welcome to HimaVolt",
        slug: "welcome-to-himavolt",
        excerpt: "Nepal's premier digital platform designed to transform the hospitality and culinary landscape.",
        content: htmlContent,
        published: true,
        categoryId: category.id,
      }
    });
    console.log("Created new post.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
