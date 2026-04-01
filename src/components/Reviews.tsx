import { Star } from "lucide-react";

const reviews = [
  {
    text: "They were a great group of people. They were respectful of their surroundings and left the place looking great with little inconveniences. Not all maintenance companies can say that.",
    author: "Strata Manager",
  },
  {
    text: "We have used their services for 8 years now. We like the all inclusive snow removal and winter packages at a fixed price. It's easy to budget for our Strata Council.",
    author: "Strata Council Member",
  },
  {
    text: "I recommended Colin to a couple other agents in the office and we all say how happy we are with their service. Taking care of buildings can have so many surprises. He's very experienced.",
    author: "Real Estate Agent",
  },
];

const Reviews = () => (
  <section className="py-20 bg-section-alt">
    <div className="container">
      <h2 className="text-3xl md:text-4xl text-center mb-12 text-foreground">
        Customer Reviews – Trusted Snow Removal Company
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {reviews.map((review, i) => (
          <div key={i} className="bg-card rounded-lg p-8 shadow-md">
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="w-5 h-5 fill-secondary text-secondary" />
              ))}
            </div>
            <p className="text-muted-foreground italic mb-4 leading-relaxed">"{review.text}"</p>
            <p className="font-heading font-bold text-foreground text-sm">— {review.author}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Reviews;
