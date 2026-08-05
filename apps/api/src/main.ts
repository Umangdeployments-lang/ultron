import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for the Next.js frontend (configurable for prod)
    const configService = app.get(ConfigService);
    const corsOrigins = (
        configService.get<string>("CORS_ORIGINS") ??
        "http://localhost:3000,http://localhost:3001"
    )
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);

    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });

    // Global validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        })
    );

    // API prefix
    app.setGlobalPrefix("api");

    // Swagger docs
    const config = new DocumentBuilder()
        .setTitle("ultron API")
        .setDescription(
            "AI-Driven Operating System for Business — workflow automation engine"
        )
        .setVersion("0.1.0")
        .addTag("workflows")
        .addTag("executions")
        .addTag("webhooks")
        .addTag("api-keys")
        .addTag("approvals")
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);

    const port = configService.get<number>("PORT") ?? 4000;

    await app.listen(port);
    console.log(`🚀 ultron API running on http://localhost:${port}/api`);
    console.log(`📚 Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap();
