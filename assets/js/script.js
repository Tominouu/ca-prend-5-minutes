const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {

    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {

        const isActive = item.classList.contains("active");

        // Ferme toutes les FAQ
        faqItems.forEach((faq) => {
            faq.classList.remove("active");
        });

        // Ouvre celle qui vient d'être cliquée
        if (!isActive) {
            item.classList.add("active");
        }

    });

});
